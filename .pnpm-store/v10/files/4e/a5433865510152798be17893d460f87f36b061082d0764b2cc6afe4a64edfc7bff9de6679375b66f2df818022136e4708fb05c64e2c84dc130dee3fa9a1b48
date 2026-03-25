import { EventStreamMarshaller as UniversalEventStreamMarshaller } from "@smithy/eventstream-serde-universal";
import { Readable } from "stream";
import { readabletoIterable } from "./utils";
export class EventStreamMarshaller {
    universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new UniversalEventStreamMarshaller({
            utf8Decoder,
            utf8Encoder,
        });
    }
    deserialize(body, deserializer) {
        const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readabletoIterable(body);
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
    }
    serialize(input, serializer) {
        return Readable.from(this.universalMarshaller.serialize(input, serializer));
    }
}
