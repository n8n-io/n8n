import { EventStreamCodec } from "@smithy/eventstream-codec";
import { PassThrough, pipeline, Readable } from "stream";
import { EventSigningStream } from "./EventSigningStream";
export class EventStreamPayloadHandler {
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    constructor(options) {
        this.messageSigner = options.messageSigner;
        this.eventStreamCodec = new EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
        this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
    }
    async handle(next, args, context = {}) {
        const request = args.request;
        const { body: payload, query } = request;
        if (!(payload instanceof Readable)) {
            throw new Error("Eventstream payload must be a Readable stream.");
        }
        const payloadStream = payload;
        request.body = new PassThrough({
            objectMode: true,
        });
        const match = request.headers?.authorization?.match(/Signature=([\w]+)$/);
        const priorSignature = match?.[1] ?? query?.["X-Amz-Signature"] ?? "";
        const signingStream = new EventSigningStream({
            priorSignature,
            eventStreamCodec: this.eventStreamCodec,
            messageSigner: await this.messageSigner(),
            systemClockOffsetProvider: this.systemClockOffsetProvider,
        });
        pipeline(payloadStream, signingStream, request.body, (err) => {
            if (err) {
                throw err;
            }
        });
        let result;
        try {
            result = await next(args);
        }
        catch (e) {
            request.body.end();
            throw e;
        }
        return result;
    }
}
