import { spawn } from "node:child_process";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createCommandAndArgs } from "./create-command-and-args.js";
import { createWriteStream } from "node:fs";
async function toStream(dot, options) {
  const [command, args] = createCommandAndArgs(options ?? {});
  return new Promise(function toStreamInternal(resolve, reject) {
    const p = spawn(command, args, { stdio: "pipe" });
    p.on("error", (e) => {
      reject(
        new Error(`Command "${command}" failed.
MESSAGE:${e.message}`, {
          cause: e
        })
      );
    });
    const stderrChunks = [];
    p.stdout.on("pause", () => p.stdout.resume());
    p.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    p.stderr.on("pause", () => p.stderr.resume());
    const dist = p.stdout.pipe(new PassThrough());
    p.on("close", async (code, signal) => {
      if (code === 0) {
        resolve(dist);
      } else {
        const message = Buffer.concat(
          stderrChunks
        ).toString();
        reject(
          new Error(
            `Command "${command}" failed.
CODE: ${code}
SIGNAL: ${signal}
MESSAGE: ${message}`
          )
        );
      }
    });
    pipeline(Readable.from([dot]), p.stdin);
  });
}
async function toFile(dot, path, options) {
  const stream = await toStream(dot, options);
  await pipeline(stream, createWriteStream(path));
}
export {
  toFile,
  toStream
};
