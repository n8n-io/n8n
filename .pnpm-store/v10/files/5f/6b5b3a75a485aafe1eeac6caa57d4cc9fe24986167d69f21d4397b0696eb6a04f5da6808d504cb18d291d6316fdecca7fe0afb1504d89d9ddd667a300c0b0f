import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral({ apiKey: apiKey });

const chatResponse = await mistral.chat.complete({
  model: "mistral-small-latest",
  messages: [{ role: "user", content: "What is the best French cheese?" }],
  responseFormat: { type: "json_object" },
});

console.log("Chat:", chatResponse.choices[0].message.content);
