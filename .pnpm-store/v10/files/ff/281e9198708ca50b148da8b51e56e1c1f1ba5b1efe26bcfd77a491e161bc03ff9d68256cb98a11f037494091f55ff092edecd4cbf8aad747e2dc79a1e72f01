import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const Explanation = z.object({
  explanation: z.string(),
  output: z.string(),
});

const MathDemonstration = z.object({
  steps: z.array(Explanation),
  final_answer: z.string(),
});

const client = new Mistral({ apiKey: apiKey });

// Structured Output using the parseStream method
// This method will return a stream of events containing the JSON response. It will not be parsed back to the initial Zod object.
// If you need to parse the stream, see the "Parse the accumulated stream back to the initial zod object" comment below.

const stream = await client.chat.parseStream({
  model: "mistral-tiny-latest",
  messages: [
    {
      role: "system",
      content:
        "You are a helpful math tutor. You will be provided with a math problem, and your goal will be to output a step by step solution, along with a final answer. For each step, just provide the output as an equation use the explanation field to detail the reasoning.",
    },
    { role: "user", content: "How can I solve 8x + 7 = -23" },
  ],
  responseFormat: MathDemonstration,
});

let accumulatedStream = "";
for await (const event of stream) {
  const content = event.data?.choices[0]?.delta.content;
  if (!content) {
    continue;
  }
  process.stdout.write(content);
  accumulatedStream += content;
}

// Parse the accumulated stream back to the initial zod object.
let parsedAccumulatedStream = MathDemonstration.safeParse(
  JSON.parse(accumulatedStream),
).data;
console.log("\n", parsedAccumulatedStream);

// Structured Output using the parse method
// This method will return the response parsed back to the initial Zod object.

const chatResponse = await client.chat.parse({
  model: "mistral-tiny-latest",
  messages: [
    {
      role: "system",
      content:
        "You are a helpful math tutor. You will be provided with a math problem, and your goal will be to output a step by step solution, along with a final answer. For each step, just provide the output as an equation use the explanation field to detail the reasoning.",
    },
    { role: "user", content: "How can I solve 8x + 7 = -23" },
  ],
  responseFormat: MathDemonstration,
});

console.log("\n", chatResponse.choices[0].message.parsed);
