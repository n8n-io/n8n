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
  eventStreamSerdeProvider: () => eventStreamSerdeProvider
});
module.exports = __toCommonJS(src_exports);

// src/EventStreamMarshaller.ts
var import_eventstream_serde_universal = require("@smithy/eventstream-serde-universal");
var import_stream = require("stream");

// src/utils.ts
async function* readabletoIterable(readStream) {
  let streamEnded = false;
  let generationEnded = false;
  const records = new Array();
  readStream.on("error", (err) => {
    if (!streamEnded) {
      streamEnded = true;
    }
    if (err) {
      throw err;
    }
  });
  readStream.on("data", (data) => {
    records.push(data);
  });
  readStream.on("end", () => {
    streamEnded = true;
  });
  while (!generationEnded) {
    const value = await new Promise((resolve) => setTimeout(() => resolve(records.shift()), 0));
    if (value) {
      yield value;
    }
    generationEnded = streamEnded && records.length === 0;
  }
}
__name(readabletoIterable, "readabletoIterable");

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
    const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readabletoIterable(body);
    return this.universalMarshaller.deserialize(bodyIterable, deserializer);
  }
  serialize(input, serializer) {
    return import_stream.Readable.from(this.universalMarshaller.serialize(input, serializer));
  }
};

// src/provider.ts
var eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  EventStreamMarshaller,
  eventStreamSerdeProvider
});

