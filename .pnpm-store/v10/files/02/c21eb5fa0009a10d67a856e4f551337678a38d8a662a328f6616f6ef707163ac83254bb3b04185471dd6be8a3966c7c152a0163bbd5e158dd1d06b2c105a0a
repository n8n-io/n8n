'use strict';

var eventstreamSerdeUniversal = require('@smithy/eventstream-serde-universal');
var stream = require('stream');

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

class EventStreamMarshaller {
    universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new eventstreamSerdeUniversal.EventStreamMarshaller({
            utf8Decoder,
            utf8Encoder,
        });
    }
    deserialize(body, deserializer) {
        const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readabletoIterable(body);
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
    }
    serialize(input, serializer) {
        return stream.Readable.from(this.universalMarshaller.serialize(input, serializer));
    }
}

const eventStreamSerdeProvider = (options) => new EventStreamMarshaller(options);

exports.EventStreamMarshaller = EventStreamMarshaller;
exports.eventStreamSerdeProvider = eventStreamSerdeProvider;
