import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey: apiKey });

const chatResponse = await client.chat.complete({
  model: "pixtral-12b",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        {
          type: "image_url",
          imageUrl:
            "https://mistral.ai/_next/image?url=https%3A%2F%2Fcms.mistral.ai%2Fassets%2Fce1514ab-62f9-4825-a20b-298f2497c536&w=3840&q=75",
        },
      ],
    },
  ],
});

console.log("JSON:", chatResponse.choices[0].message.content);
