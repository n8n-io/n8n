import { Mistral } from "@mistralai/mistralai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

// Get the absolute directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "ocr.pdf");

// Upload the file and run ocr
const uploaded_file = fs.readFileSync(filePath);
const uploaded_pdf = await client.files.upload({
  file: {
    fileName: "uploaded_file.pdf",
    content: uploaded_file,
  },
  purpose: "ocr",
});

const ocrResponse = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: {
    type: "file",
    fileId: uploaded_pdf.id,
  },
  includeImageBase64: true,
});
console.log("OCR ", ocrResponse);
