import { EventStreamCodec } from "@smithy/eventstream-codec";
import { EventSigningTransformStream } from "./EventSigningTransformStream";
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
        const { body: payload, headers, query } = request;
        if (!(payload instanceof ReadableStream)) {
            throw new Error("Eventstream payload must be a ReadableStream.");
        }
        const placeHolderStream = new TransformStream();
        request.body = placeHolderStream.readable;
        const match = (headers?.authorization ?? "").match(/Signature=(\w+)$/);
        let priorSignature = (match ?? [])[1] ?? (query && query["X-Amz-Signature"]) ?? "";
        if (context.__staticSignature) {
            priorSignature = "";
        }
        const signingStream = new EventSigningTransformStream(priorSignature, await this.messageSigner(), this.eventStreamCodec, this.systemClockOffsetProvider);
        payload.pipeThrough(signingStream).pipeThrough(placeHolderStream);
        let result;
        try {
            result = await next(args);
        }
        catch (e) {
            const p = payload.cancel?.();
            if (p instanceof Promise) {
                p.catch(() => { });
            }
            throw e;
        }
        return result;
    }
}
