import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral({ apiKey: apiKey });

const stream = await mistral.audio.transcriptions.stream({
  model: "voxtral-mini-latest",
  fileUrl: "https://docs.mistral.ai/audio/bcn_weather.mp3",
});

for await (const event of stream) {
  process.stdout.write(JSON.stringify(event));
  process.stdout.write("\n");
}
