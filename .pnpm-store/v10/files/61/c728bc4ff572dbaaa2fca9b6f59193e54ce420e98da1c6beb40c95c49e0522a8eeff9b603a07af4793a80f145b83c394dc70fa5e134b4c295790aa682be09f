import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

const ocrResponse = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: {
    type: "document_url",
    documentUrl: "https://arxiv.org/pdf/2201.04234.pdf",
  },
  includeImageBase64: true,
});

console.log("OCR:", ocrResponse);
