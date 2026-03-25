import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral({ apiKey: apiKey });

const stream = await mistral.chat.stream({
  model: "mistral-tiny",
  messages: [
    {
      role: "user",
      content: "What is the best French cheese?",
    },
  ],
});

for await (const event of stream) {
  const content = event.data?.choices[0]?.delta.content;
  if (!content) {
    continue;
  }

  process.stdout.write(content);
}
