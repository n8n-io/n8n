import { MistralAzure } from "@mistralai/mistralai-azure";

const azureAPIKey = process.env["AZURE_API_KEY"];
if (!azureAPIKey) {
  throw new Error("missing AZURE_API_KEY environment variable");
}

const azureEndpoint = process.env["AZURE_ENDPOINT"];
if (!azureEndpoint) {
  throw new Error("missing AZURE_ENDPOINT environment variable");
}

const sdk = new MistralAzure({
  apiKey: azureAPIKey,
  endpoint: azureEndpoint,
});

const chatResult = await sdk.chat.complete({
  messages: [
    {
      role: "user",
      content: "What is the best French cheese ?",
    },
  ],
});

console.log("Success", chatResult);
