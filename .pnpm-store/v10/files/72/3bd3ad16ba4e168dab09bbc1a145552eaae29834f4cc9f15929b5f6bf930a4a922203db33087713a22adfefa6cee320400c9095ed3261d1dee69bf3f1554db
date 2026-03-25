var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  EventStreamMarshaller: () => EventStreamMarshaller,
  eventStreamSerdeProvider: () => eventStreamSerdeProvider,
  iterableToReadableStream: () => iterableToReadableStream,
  readableStreamtoIterable: () => readableStreamtoIterable
});
module.exports = __toCommonJS(src_exports);

// src/EventStreamMarshaller.ts
var import_eventstream_serde_universal = require("@smithy/eventstream-serde-universal");

// src/utils.ts
var readableStreamtoIterable = /* @__PURE__ */ __name((readableStream) => ({
  [Symbol.asyncIterator]: async function* () {
    const reader = readableStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
}), "readableStreamtoIterable");
var iterableToReadableStream = /* @__PURE__ */ __name((asyncIterable) => {
  const iterator = asyncIterable[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await iterator.next();
      if (done) {
        return controller.close();
      }
      controller.enqueue(value);
    }
  });
}, "iterableToReadableStream");

// src/EventStreamMarshaller.ts
var EventStreamMarshaller = class {
  static {
    __name(this, "EventStreamMarshaller");
  }
  constructor({ utf8Encoder, utf8Decoder }) {
    this.universalMarshaller = new import_eventstream_serde_universal.EventStreamMarshaller({
      utf8Decoder,
      utf8Encoder
    });
  }
  deserialize(body, deserializer) {
    const bodyIterable = isReadableStream(body) ? readableStreamtoIterable(body) : body;
    return this.universalMarshaller.deserialize(bodyIterable, deserializer);
  }
  /**
   * Generate a stream that serialize events into stream of binary chunks;
   *
   * Caveat is that streaming request payload doesn't work on browser with native
   * xhr or fetch handler currently because they don't support upload streaming.
   * reference:
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=688906
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1387483
   *
   */
  serialize(input, serializer) {
    const serialziedIterable = this.universalMarshaller.serialize(input, serializer);
    return typeof ReadableStream === "function" ? iterableToReadableStream(serialziedIterable) : serialziedIterable;
  }
};
var isReadableStream = /* @__PURE__ */ __name((body) => typeof ReadableStream === "function" && body instanceof ReadableStream, "isReadableStream");

// src/provider.ts
var eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  EventStreamMarshaller,
  eventStreamSerdeProvider,
  readableStreamtoIterable,
  iterableToReadableStream
});

