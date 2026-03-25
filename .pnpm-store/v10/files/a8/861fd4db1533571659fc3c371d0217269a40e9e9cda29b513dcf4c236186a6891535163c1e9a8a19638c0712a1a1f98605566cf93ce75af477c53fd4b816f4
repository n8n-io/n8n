'use strict';

var eventstreamSerdeUniversal = require('@smithy/eventstream-serde-universal');

const readableStreamtoIterable = (readableStream) => ({
    [Symbol.asyncIterator]: async function* () {
        const reader = readableStream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    return;
                yield value;
            }
        }
        finally {
            reader.releaseLock();
        }
    },
});
const iterableToReadableStream = (asyncIterable) => {
    const iterator = asyncIterable[Symbol.asyncIterator]();
    return new ReadableStream({
        async pull(controller) {
            const { done, value } = await iterator.next();
            if (done) {
                return controller.close();
            }
            controller.enqueue(value);
        },
    });
};

class EventStreamMarshaller {
    universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new eventstreamSerdeUniversal.EventStreamMarshaller({
            utf8Decoder,
            utf8Encoder,
        });
    }
    deserialize(body, deserializer) {
        const bodyIterable = isReadableStream(body) ? readableStreamtoIterable(body) : body;
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
    }
    serialize(input, serializer) {
        const serialziedIterable = this.universalMarshaller.serialize(input, serializer);
        return typeof ReadableStream === "function" ? iterableToReadableStream(serialziedIterable) : serialziedIterable;
    }
}
const isReadableStream = (body) => typeof ReadableStream === "function" && body instanceof ReadableStream;

const eventStreamSerdeProvider = (options) => new EventStreamMarshaller(options);

exports.EventStreamMarshaller = EventStreamMarshaller;
exports.eventStreamSerdeProvider = eventStreamSerdeProvider;
exports.iterableToReadableStream = iterableToReadableStream;
exports.readableStreamtoIterable = readableStreamtoIterable;
