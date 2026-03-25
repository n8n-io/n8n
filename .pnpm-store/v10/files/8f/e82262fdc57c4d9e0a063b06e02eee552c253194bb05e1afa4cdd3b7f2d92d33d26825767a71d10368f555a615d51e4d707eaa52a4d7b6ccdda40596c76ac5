import { Mistral } from "@mistralai/mistralai";
import { SDKError } from "../../models/errors/index.js";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey: apiKey });

try {
  const chatResponse = await client.chat.complete({
    model: "pixtral-12b",
    messages: [
      {
        role: "user",
        content: "hello",
      },
      {
        role: "assistant",
        content: "hey",
      },
    ],
  });
} catch (e) {
  if (e instanceof SDKError) {
    process.stdout.write(e.message);
  } else {
    throw e;
  }
}
