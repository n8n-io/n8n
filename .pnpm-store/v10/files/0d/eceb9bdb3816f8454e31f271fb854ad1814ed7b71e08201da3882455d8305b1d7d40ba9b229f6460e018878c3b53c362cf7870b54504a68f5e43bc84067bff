"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_child_process = require("node:child_process");
const node_stream = require("node:stream");
const promises = require("node:stream/promises");
const createCommandAndArgs = require("./create-command-and-args.cjs");
const node_fs = require("node:fs");
async function toStream(dot, options) {
  const [command, args] = createCommandAndArgs.createCommandAndArgs(options ?? {});
  return new Promise(function toStreamInternal(resolve, reject) {
    const p = node_child_process.spawn(command, args, { stdio: "pipe" });
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
    const dist = p.stdout.pipe(new node_stream.PassThrough());
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
    promises.pipeline(node_stream.Readable.from([dot]), p.stdin);
  });
}
async function toFile(dot, path, options) {
  const stream = await toStream(dot, options);
  await promises.pipeline(stream, node_fs.createWriteStream(path));
}
exports.toFile = toFile;
exports.toStream = toStream;
