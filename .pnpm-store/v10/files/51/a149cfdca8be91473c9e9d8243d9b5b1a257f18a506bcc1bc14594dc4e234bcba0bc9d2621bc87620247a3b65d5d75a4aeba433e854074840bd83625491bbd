import * as fs from "fs";
import { Mistral } from "@mistralai/mistralai";
import path from "path";
import { fileURLToPath } from "url";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral();

// Get the absolute directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "file.jsonl");

// Create a new file
const blob = new Blob([fs.readFileSync(filePath)], {
  type: "application/json",
});
const createdFile = await mistral.files.upload({ file: blob });

// Create a new job
const hyperparameters = {
  training_steps: 10,
  learning_rate: 0.0001,
};
const createdJob = await mistral.fineTuning.jobs.create({
  model: "open-mistral-7b",
  trainingFiles: [{ fileId: createdFile.id, weight: 1 }],
  validationFiles: [createdFile.id],
  hyperparameters: hyperparameters,
});
console.log(createdJob);

// List jobs
const jobs = await mistral.fineTuning.jobs.list();
console.log(jobs);

// Retrieve a job
const retrievedJob = await mistral.fineTuning.jobs.get({
  jobId: createdJob.id,
});
console.log(retrievedJob);

// Cancel a job
const canceledJob = await mistral.fineTuning.jobs.cancel({
  jobId: createdJob.id,
});
console.log(canceledJob);
