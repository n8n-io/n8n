import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey: apiKey });

const inputs = [];
for (let i = 0; i < 1; i++) {
  inputs.push("What is the best French cheese?");
}

const embeddingsBatchResponse = await client.embeddings.create({
  model: "mistral-embed",
  inputs: inputs,
});

console.log("Embeddings Batch:", embeddingsBatchResponse.data);
