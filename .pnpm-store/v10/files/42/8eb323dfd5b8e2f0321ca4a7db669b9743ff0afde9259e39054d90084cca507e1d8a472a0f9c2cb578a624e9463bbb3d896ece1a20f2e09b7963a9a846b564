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
export {
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertAsyncIterableToArray,
  convertReadableStreamToArray,
  convertResponseStreamToArray,
  isNodeVersion,
  mockId
};
//# sourceMappingURL=index.mjs.map