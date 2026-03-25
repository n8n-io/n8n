import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const projectId = process.env["GOOGLE_PROJECT_ID"];
if (!projectId) {
  throw new Error("missing GOOGLE_PROJECT_ID environment variable");
}

const sdk = new MistralGoogleCloud({
  region: "europe-west4",
  projectId: projectId,
});

const chatResult = await sdk.chat.complete({
  model: "mistral-large-2407",
  messages: [
    {
      role: "user",
      content: "What is the best French cheese ?",
    },
  ],
});

console.log("Success", chatResult);
