import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const mistral = new Mistral({ apiKey: apiKey });

const response = await mistral.audio.transcriptions.complete({
  model: "voxtral-mini-2602",
  fileUrl: "https://docs.mistral.ai/audio/bcn_weather.mp3",
  diarize: true,
  timestampGranularities: ["segment"],
});

process.stdout.write(JSON.stringify(response));
