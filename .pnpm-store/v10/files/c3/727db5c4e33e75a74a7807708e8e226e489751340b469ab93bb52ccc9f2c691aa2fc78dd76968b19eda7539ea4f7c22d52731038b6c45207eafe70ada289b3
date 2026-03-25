import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral({ apiKey: apiKey });

const listModelsResponse = await mistral.models.list();

listModelsResponse.data.forEach((model) => {
  console.log("Model:", model);
});
