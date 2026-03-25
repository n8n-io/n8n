import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey: apiKey });

const chatResponse = await client.chat.complete({
  model: "mistral-tiny",
  messages: [{ role: "user", content: "What is the best French cheese?" }],
});

console.log("Chat:", chatResponse);
