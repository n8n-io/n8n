import * as fs from "fs";
import { Mistral } from "@mistralai/mistralai";
import path from "path";
import { fileURLToPath } from "url";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

// Get the absolute directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Mistral({ apiKey: apiKey });

// Create a new file
const filePath = path.join(__dirname, "file.jsonl");
const blob = new Blob([fs.readFileSync(filePath)], {
  type: "application/json",
});
const createdFile = await client.files.upload({ file: blob });

console.log(createdFile);

// List files
const files = await client.files.list();
console.log(files);

// Retrieve a file
const retrievedFile = await client.files.retrieve({ fileId: createdFile.id });
console.log(retrievedFile);

// Delete a file
const deletedFile = await client.files.delete({ fileId: createdFile.id });
console.log(deletedFile);
