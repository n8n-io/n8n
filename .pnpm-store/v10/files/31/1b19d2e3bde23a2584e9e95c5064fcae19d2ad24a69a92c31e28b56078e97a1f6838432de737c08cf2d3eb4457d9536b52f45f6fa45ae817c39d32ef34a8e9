var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var concat_exports = {};
__export(concat_exports, {
  concat: () => concat
});
module.exports = __toCommonJS(concat_exports);
var import_stream = require("stream");
var import_typeGuards = require("./typeGuards.js");
async function* streamAsyncIterator() {
  const reader = this.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
function makeAsyncIterable(webStream) {
  if (!webStream[Symbol.asyncIterator]) {
    webStream[Symbol.asyncIterator] = streamAsyncIterator.bind(webStream);
  }
  if (!webStream.values) {
    webStream.values = streamAsyncIterator.bind(webStream);
  }
}
function ensureNodeStream(stream) {
  if (stream instanceof ReadableStream) {
    makeAsyncIterable(stream);
    return import_stream.Readable.fromWeb(stream);
  } else {
    return stream;
  }
}
function toStream(source) {
  if (source instanceof Uint8Array) {
    return import_stream.Readable.from(Buffer.from(source));
  } else if ((0, import_typeGuards.isBlob)(source)) {
    return ensureNodeStream(source.stream());
  } else {
    return ensureNodeStream(source);
  }
}
async function concat(sources) {
  return function() {
    const streams = sources.map((x) => typeof x === "function" ? x() : x).map(toStream);
    return import_stream.Readable.from(
      (async function* () {
        for (const stream of streams) {
          for await (const chunk of stream) {
            yield chunk;
          }
        }
      })()
    );
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  concat
});
