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
var import_eventstream_codec = require("@smithy/eventstream-codec");

// src/getChunkedStream.ts
function getChunkedStream(source) {
  let currentMessageTotalLength = 0;
  let currentMessagePendingLength = 0;
  let currentMessage = null;
  let messageLengthBuffer = null;
  const allocateMessage = /* @__PURE__ */ __name((size) => {
    if (typeof size !== "number") {
      throw new Error("Attempted to allocate an event message where size was not a number: " + size);
    }
    currentMessageTotalLength = size;
    currentMessagePendingLength = 4;
    currentMessage = new Uint8Array(size);
    const currentMessageView = new DataView(currentMessage.buffer);
    currentMessageView.setUint32(0, size, false);
  }, "allocateMessage");
  const iterator = /* @__PURE__ */ __name(async function* () {
    const sourceIterator = source[Symbol.asyncIterator]();
    while (true) {
      const { value, done } = await sourceIterator.next();
      if (done) {
        if (!currentMessageTotalLength) {
          return;
        } else if (currentMessageTotalLength === currentMessagePendingLength) {
          yield currentMessage;
        } else {
          throw new Error("Truncated event message received.");
        }
        return;
      }
      const chunkLength = value.length;
      let currentOffset = 0;
      while (currentOffset < chunkLength) {
        if (!currentMessage) {
          const bytesRemaining = chunkLength - currentOffset;
          if (!messageLengthBuffer) {
            messageLengthBuffer = new Uint8Array(4);
          }
          const numBytesForTotal = Math.min(
            4 - currentMessagePendingLength,
            // remaining bytes to fill the messageLengthBuffer
            bytesRemaining
            // bytes left in chunk
          );
          messageLengthBuffer.set(
            // @ts-ignore error TS2532: Object is possibly 'undefined' for value
            value.slice(currentOffset, currentOffset + numBytesForTotal),
            currentMessagePendingLength
          );
          currentMessagePendingLength += numBytesForTotal;
          currentOffset += numBytesForTotal;
          if (currentMessagePendingLength < 4) {
            break;
          }
          allocateMessage(new DataView(messageLengthBuffer.buffer).getUint32(0, false));
          messageLengthBuffer = null;
        }
        const numBytesToWrite = Math.min(
          currentMessageTotalLength - currentMessagePendingLength,
          // number of bytes left to complete message
          chunkLength - currentOffset
          // number of bytes left in the original chunk
        );
        currentMessage.set(
          // @ts-ignore error TS2532: Object is possibly 'undefined' for value
          value.slice(currentOffset, currentOffset + numBytesToWrite),
          currentMessagePendingLength
        );
        currentMessagePendingLength += numBytesToWrite;
        currentOffset += numBytesToWrite;
        if (currentMessageTotalLength && currentMessageTotalLength === currentMessagePendingLength) {
          yield currentMessage;
          currentMessage = null;
          currentMessageTotalLength = 0;
          currentMessagePendingLength = 0;
        }
      }
    }
  }, "iterator");
  return {
    [Symbol.asyncIterator]: iterator
  };
}
__name(getChunkedStream, "getChunkedStream");

// src/getUnmarshalledStream.ts
function getMessageUnmarshaller(deserializer, toUtf8) {
  return async function(message) {
    const { value: messageType } = message.headers[":message-type"];
    if (messageType === "error") {
      const unmodeledError = new Error(message.headers[":error-message"].value || "UnknownError");
      unmodeledError.name = message.headers[":error-code"].value;
      throw unmodeledError;
    } else if (messageType === "exception") {
      const code = message.headers[":exception-type"].value;
      const exception = { [code]: message };
      const deserializedException = await deserializer(exception);
      if (deserializedException.$unknown) {
        const error = new Error(toUtf8(message.body));
        error.name = code;
        throw error;
      }
      throw deserializedException[code];
    } else if (messageType === "event") {
      const event = {
        [message.headers[":event-type"].value]: message
      };
      const deserialized = await deserializer(event);
      if (deserialized.$unknown)
        return;
      return deserialized;
    } else {
      throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
    }
  };
}
__name(getMessageUnmarshaller, "getMessageUnmarshaller");

// src/EventStreamMarshaller.ts
var EventStreamMarshaller = class {
  static {
    __name(this, "EventStreamMarshaller");
  }
  constructor({ utf8Encoder, utf8Decoder }) {
    this.eventStreamCodec = new import_eventstream_codec.EventStreamCodec(utf8Encoder, utf8Decoder);
    this.utfEncoder = utf8Encoder;
  }
  deserialize(body, deserializer) {
    const inputStream = getChunkedStream(body);
    return new import_eventstream_codec.SmithyMessageDecoderStream({
      messageStream: new import_eventstream_codec.MessageDecoderStream({ inputStream, decoder: this.eventStreamCodec }),
      // @ts-expect-error Type 'T' is not assignable to type 'Record<string, any>'
      deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder)
    });
  }
  serialize(inputStream, serializer) {
    return new import_eventstream_codec.MessageEncoderStream({
      messageStream: new import_eventstream_codec.SmithyMessageEncoderStream({ inputStream, serializer }),
      encoder: this.eventStreamCodec,
      includeEndFrame: true
    });
  }
};

// src/provider.ts
var eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  EventStreamMarshaller,
  eventStreamSerdeProvider
});

