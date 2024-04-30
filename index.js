const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodeMailer = require("nodemailer");

app.use(cors());

require("dotenv").config();
let PORT = process.env.PORT;
let URL = process.env.URL;

app.use(express.json());

mongoose
  .connect(URL)
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  accountNumber: { type: Number, unique: true },
  verification: { type: Number, unique: true },
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

app.post("/signup", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      accountNumber,
      verification,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    function generateAccountNumber() {
      const randomNumber = Math.floor(Math.random() * Math.pow(10, 10));
      const accountNumber = randomNumber.toString().padStart(10, "0");
      return accountNumber;
    }

    const accNo = generateAccountNumber();

    function generateRandomNumber() {
      let randomNumber = "";
      for (let i = 0; i < 5; i++) {
        randomNumber += Math.floor(Math.random() * 10);
      }
      return randomNumber;
    }

    const randomFive = generateRandomNumber();

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      accountNumber: accNo,
      verification: randomFive,
    });
    await newUser
      .save()
      .then((response) => {
        console.log(response);
        console.log("User registered succesfully");
        sendMail(email, randomFive);
        res
          .status(201)
          .json({ message: "User created successfully", response });
      })
      .catch((err) => {
        console.log(err);
        if (err) {
          res.status(500).json({ message: "There is an error", error: err });
        }
      });
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/verify", async (req, res) => {
  const { useremail, verification } = req.body;
  console.log(useremail, verification);

  try {
    const user = await User.findOne({ email: useremail, verification });

    if (user) {
      res.json({
        message: "Verification successful. Redirecting to login page.",
      });
    } else {
      res.status(400).json({ message: "Invalid verification code." });
    }
  } catch (error) {
    console.error("Error verifying code:", error);
    res
      .status(500)
      .json({ message: "Error verifying code. Please try again later." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, "secret", {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/user", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, "secret");
    const user = await User.findById(decodedToken.userId);
    res
      .status(200)
      .json({
        firstName: user.firstName,
        lastName: user.lastName,
        accountNumber: user.accountNumber,
        user,
      });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
});

let htmlText = `<h6><a href="http://localhost:3000/login">click on this link to verify your email</a></h6>`;

const sendMail = (email) => {
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
  let mailOption = {
    from: process.env.EMAIL,
    to: email,
    subject: "Hello Ore✔",
    html: htmlText,
  };

  transporter.sendMail(mailOption, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Email sent");
    }
  });
};
