import { EventStreamMarshaller as UniversalEventStreamMarshaller } from "@smithy/eventstream-serde-universal";
import { iterableToReadableStream, readableStreamtoIterable } from "./utils";
export class EventStreamMarshaller {
    constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new UniversalEventStreamMarshaller({
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
