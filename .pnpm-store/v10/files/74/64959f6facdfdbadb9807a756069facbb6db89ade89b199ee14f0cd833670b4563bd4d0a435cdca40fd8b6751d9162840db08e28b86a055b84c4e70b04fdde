"use strict";
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

// src/test/index.ts
var index_exports = {};
__export(index_exports, {
  convertArrayToAsyncIterable: () => convertArrayToAsyncIterable,
  convertArrayToReadableStream: () => convertArrayToReadableStream,
  convertAsyncIterableToArray: () => convertAsyncIterableToArray,
  convertReadableStreamToArray: () => convertReadableStreamToArray,
  convertResponseStreamToArray: () => convertResponseStreamToArray,
  isNodeVersion: () => isNodeVersion,
  mockId: () => mockId
});
module.exports = __toCommonJS(index_exports);

// src/test/convert-array-to-async-iterable.ts
function convertArrayToAsyncIterable(values) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const value of values) {
        yield value;
      }
    }
  };
}

// src/test/convert-array-to-readable-stream.ts
function convertArrayToReadableStream(values) {
  return new ReadableStream({
    start(controller) {
      try {
        for (const value of values) {
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    }
  });
}

// src/test/convert-async-iterable-to-array.ts
async function convertAsyncIterableToArray(iterable) {
  const result = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

// src/test/convert-readable-stream-to-array.ts
async function convertReadableStreamToArray(stream) {
  const reader = stream.getReader();
  const result = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result.push(value);
  }
  return result;
}

// src/test/convert-response-stream-to-array.ts
async function convertResponseStreamToArray(response) {
  return convertReadableStreamToArray(
    response.body.pipeThrough(new TextDecoderStream())
  );
}

// src/test/is-node-version.ts
function isNodeVersion(version) {
  const nodeMajorVersion = parseInt(process.version.slice(1).split(".")[0], 10);
  return nodeMajorVersion === version;
}

// src/test/mock-id.ts
function mockId({
  prefix = "id"
} = {}) {
  let counter = 0;
  return () => `${prefix}-${counter++}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertAsyncIterableToArray,
  convertReadableStreamToArray,
  convertResponseStreamToArray,
  isNodeVersion,
  mockId
});
//# sourceMappingURL=index.js.map