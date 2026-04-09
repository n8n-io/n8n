import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import {
  AudioEncoding,
  RealtimeTranscription,
} from "@mistralai/mistralai/extra/realtime";

type KnownAudioEncoding = (typeof AudioEncoding)[keyof typeof AudioEncoding];

const DEFAULT_ENCODING: KnownAudioEncoding = AudioEncoding.PcmS16le;
const DEFAULT_SAMPLE_RATE = 16000;

const FFMPEG_FORMAT_BY_ENCODING: Record<KnownAudioEncoding, string> = {
  [AudioEncoding.PcmS16le]: "s16le",
  [AudioEncoding.PcmS32le]: "s32le",
  [AudioEncoding.PcmF32le]: "f32le",
  [AudioEncoding.PcmF16le]: "f16le",
  [AudioEncoding.PcmMulaw]: "mulaw",
  [AudioEncoding.PcmAlaw]: "alaw",
};

type Args = {
  file?: string;
  model: string;
  apiKey?: string;
  baseUrl: string;
  noConvert: boolean;
};

function parseArgs(): Args {
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: $0 <file> [options]")
    .option("model", {
      type: "string",
      default: "voxtral-mini-transcribe-realtime-2602",
      describe: "Model ID",
    })
    .option("api-key", {
      type: "string",
      default: process.env["MISTRAL_API_KEY"],
      describe: "Mistral API key",
    })
    .option("base-url", {
      type: "string",
      default: process.env["MISTRAL_BASE_URL"] ?? "https://api.mistral.ai",
      describe: "API base URL",
    })
    .option("no-convert", {
      type: "boolean",
      default: false,
      describe: "Skip ffmpeg conversion (input must be raw PCM)",
    })
    .help()
    .parseSync();

  const fileArg = argv._[0];
  const file = typeof fileArg === "string" ? fileArg : undefined;

  return {
    file,
    model: argv.model,
    apiKey: argv.apiKey,
    baseUrl: argv.baseUrl,
    noConvert: argv.noConvert,
  };
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        reject(new Error(
          "ffmpeg not found. Install ffmpeg or use --no-convert with raw PCM input.",
        ));
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const details = stderr.trim();
      reject(new Error(
        `ffmpeg conversion failed${details ? `: ${details}` : ""}`,
      ));
    });
  });
}

async function convertAudioToPcm(
  inputPath: string,
  encoding: KnownAudioEncoding,
  sampleRate: number,
): Promise<string> {
  const tempPath = join(
    tmpdir(),
    `mistral-realtime-${randomUUID()}.pcm`,
  );

  const ffmpegFormat = FFMPEG_FORMAT_BY_ENCODING[encoding];
  const args = [
    "-y",
    "-i",
    inputPath,
    "-f",
    ffmpegFormat,
    "-ar",
    String(sampleRate),
    "-ac",
    "1",
    tempPath,
  ];

  try {
    await runFfmpeg(args);
  } catch (err) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw err;
  }

  return tempPath;
}

async function* streamAudioFile(
  filePath: string,
  chunkSize: number = 4096,
): AsyncIterable<Uint8Array> {
  for await (const chunk of createReadStream(filePath, { highWaterMark: chunkSize })) {
    yield chunk as Uint8Array;
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.file) {
    console.error(
      "Missing audio file. Provide a file path after the script name.",
    );
    return;
  }

  const apiKey = args.apiKey ?? process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "Missing MISTRAL_API_KEY. Set the environment variable or pass --api-key.",
    );
  }

  const inputPath = resolve(args.file);

  let audioPath = inputPath;
  let tempPath: string | undefined;

  const extension = extname(inputPath).toLowerCase();
  const isRawPcm = extension === ".pcm" || extension === ".raw";
  if (!args.noConvert && !isRawPcm) {
    tempPath = await convertAudioToPcm(
      inputPath,
      DEFAULT_ENCODING,
      DEFAULT_SAMPLE_RATE,
    );
    audioPath = tempPath;
  }

  const client = new RealtimeTranscription({
    apiKey: apiKey,
    serverURL: args.baseUrl,
  });

  try {
    for await (const event of client.transcribeStream(
      streamAudioFile(audioPath),
      args.model,
      {
        audioFormat: {
          encoding: DEFAULT_ENCODING,
          sampleRate: DEFAULT_SAMPLE_RATE,
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
        console.error(`Transcription error: ${errorMessage}`);
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  }
}

await main();
