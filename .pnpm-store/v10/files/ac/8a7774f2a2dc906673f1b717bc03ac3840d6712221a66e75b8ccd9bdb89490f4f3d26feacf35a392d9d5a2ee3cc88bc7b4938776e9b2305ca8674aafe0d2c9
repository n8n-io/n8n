import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const MODEL = "mistral-medium-latest";

const client = new Mistral({ apiKey: apiKey });

const agent = await client.beta.agents.create({
  model: MODEL,
  name: "WebSearch Agent",
  instructions:
    "Use your websearch abilities when answering requests you don't know.",
  description: "Agent able to fetch new information on the web.",
  tools: [{ type: "web_search" }],
});

const startResult = await client.beta.conversations.start({
  agentId: agent.id,
  inputs: "Who won the last Champions League?",
});

console.log("All result entries:");
startResult.outputs.forEach((entry) => console.log("entry: ", entry));

const appendResult = await client.beta.conversations.append({
  conversationId: startResult.conversationId,
  conversationAppendRequest: {
    inputs: "And what about the previous year?",
  },
});

console.log("All result entries:");
appendResult.outputs.forEach((entry) => console.log("entry: ", entry));
