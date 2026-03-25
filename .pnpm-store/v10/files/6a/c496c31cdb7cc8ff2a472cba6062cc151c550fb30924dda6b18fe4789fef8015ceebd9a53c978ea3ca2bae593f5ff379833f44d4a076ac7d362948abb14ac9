import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey: apiKey });

const code = `
class Cheese {
  name: string = "";
  type: string = "";
  countryOfOrigin: string = "";
}

export default Cheese;`;

const refactorPrompt = `Add a "price" property of type number to the Cheese class. Respond only with code, no explanation.`;

const chatResponse = await client.chat.complete({
  model: "codestral-latest",
  messages: [
    { role: "user", content: refactorPrompt },
    { role: "user", content: code },
  ],
  prediction: {
    type: "content",
    content: code,
  },
});

console.log(chatResponse.choices[0]?.message.content);
