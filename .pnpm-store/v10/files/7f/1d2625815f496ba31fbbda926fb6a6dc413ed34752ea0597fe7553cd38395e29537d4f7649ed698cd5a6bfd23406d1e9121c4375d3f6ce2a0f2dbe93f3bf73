import { EventStreamCodec, MessageDecoderStream, MessageEncoderStream, SmithyMessageDecoderStream, SmithyMessageEncoderStream, } from "@smithy/eventstream-codec";
import { getChunkedStream } from "./getChunkedStream";
import { getMessageUnmarshaller } from "./getUnmarshalledStream";
export class EventStreamMarshaller {
    eventStreamCodec;
    utfEncoder;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.eventStreamCodec = new EventStreamCodec(utf8Encoder, utf8Decoder);
        this.utfEncoder = utf8Encoder;
    }
    deserialize(body, deserializer) {
        const inputStream = getChunkedStream(body);
        return new SmithyMessageDecoderStream({
            messageStream: new MessageDecoderStream({ inputStream, decoder: this.eventStreamCodec }),
            deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder),
        });
    }
    serialize(inputStream, serializer) {
        return new MessageEncoderStream({
            messageStream: new SmithyMessageEncoderStream({ inputStream, serializer }),
            encoder: this.eventStreamCodec,
            includeEndFrame: true,
        });
    }
}
