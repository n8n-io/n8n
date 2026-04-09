import { spawn, type ChildProcess } from "node:child_process";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import {
  AudioEncoding,
  RealtimeTranscription,
} from "@mistralai/mistralai/extra/realtime";

type Args = {
  model: string;
  encoding: string;
  sampleRate: number;
  apiKey?: string;
  baseUrl: string;
};

function parseArgs(): Args {
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: $0 [options]")
    .option("model", {
      type: "string",
      default: "voxtral-mini-transcribe-realtime-2602",
      describe: "Model ID",
    })
    .option("encoding", {
      type: "string",
      default: AudioEncoding.PcmS16le,
      describe: "Audio encoding",
    })
    .option("sample-rate", {
      type: "number",
      default: 16000,
      describe: "Sample rate in Hz",
    })
    .option("api-key", {
      type: "string",
      default: process.env["MISTRAL_API_KEY"],
      describe: "Mistral API key",
    })
    .option("base-url", {
      type: "string",
      default: process.env["MISTRAL_BASE_URL"] ?? "wss://api.mistral.ai",
      describe: "API base URL",
    })
    .help()
    .parseSync();

  return {
    model: argv.model,
    encoding: argv.encoding,
    sampleRate: argv.sampleRate,
    apiKey: argv.apiKey,
    baseUrl: argv.baseUrl,
  };
}

async function* captureAudio(
  sampleRate: number,
): AsyncGenerator<Uint8Array, void, unknown> {
  const recorder: ChildProcess = spawn(
    "rec",
    [
      "-q",
      "-t", "raw",
      "-b", "16",
      "-e", "signed-integer",
      "-r", String(sampleRate),
      "-c", "1",
      "-",
    ],
    { stdio: ["ignore", "pipe", "ignore"] },
  );

  recorder.on("error", (err) => {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      console.error(
        "\nError: 'rec' not found. Install SoX: brew install sox (macOS) or apt install sox (Linux)",
      );
      process.exit(1);
    }
    throw err;
  });

  try {
    if (!recorder.stdout) {
      throw new Error("Failed to create audio capture stream");
    }
    for await (const chunk of recorder.stdout) {
      yield new Uint8Array(chunk as Buffer);
    }
  } finally {
    if (!recorder.killed) {
      recorder.kill("SIGTERM");
    }
  }
}

function clearLine(): void {
  process.stdout.write("\x1b[2K\r");
}

async function main(): Promise<void> {
  const args = parseArgs();

  const apiKey = args.apiKey ?? process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    console.error(
      "Missing MISTRAL_API_KEY. Set the environment variable or pass --api-key.",
    );
    process.exit(1);
  }

  const client = new RealtimeTranscription({
    apiKey: apiKey,
    serverURL: args.baseUrl,
  });

  console.log("Listening... (Ctrl+C to stop)\n");

  const audioStream = captureAudio(args.sampleRate);

  process.on("SIGINT", () => {
    clearLine();
    console.log("\nStopped.");
    process.exit(0);
  });

  try {
    for await (const event of client.transcribeStream(
      audioStream,
      args.model,
      {
        audioFormat: {
          encoding: args.encoding,
          sampleRate: args.sampleRate,
        },
      },
    )) {
      if (event.type === "transcription.text.delta") {
        process.stdout.write(event.text);
        continue;
      }
      if (event.type === "transcription.done") {
        process.stdout.write("\n");
        break;
      }
      if (event.type === "error") {
        const errorMessage = typeof event.error.message === "string"
          ? event.error.message
          : JSON.stringify(event.error.message);
        console.error(`\nTranscription error: ${errorMessage}`);
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    await audioStream.return?.();
  }
}

await main();
