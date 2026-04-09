import { EventStreamCodec } from "@smithy/eventstream-codec";
import { PassThrough, pipeline, Readable } from "node:stream";
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
        const { body: payload, query } = request;
        if (!(payload instanceof Readable)) {
            throw new Error("Eventstream payload must be a Readable stream.");
        }
        const payloadStream = payload;
        request.body = new PassThrough({
            objectMode: true,
        });
        const match = request.headers?.authorization?.match(/Signature=([\w]+)$/);
        let priorSignature = match?.[1] ?? query?.["X-Amz-Signature"] ?? "";
        if (context.__staticSignature) {
            priorSignature = "";
        }
        const signingStream = new EventSigningTransformStream({
            priorSignature,
            eventStreamCodec: this.eventStreamCodec,
            messageSigner: await this.messageSigner(),
            systemClockOffsetProvider: this.systemClockOffsetProvider,
        });
        let resolvePipeline;
        const pipelineError = new Promise((resolve, reject) => {
            resolvePipeline = () => resolve(undefined);
            pipeline(payloadStream, signingStream, request.body, (err) => {
                if (err) {
                    reject(new Error(`Pipeline error in @aws-sdk/eventstream-handler-node: ${err.message}`, { cause: err }));
                }
            });
        });
        let result;
        try {
            result = await Promise.race([next(args), pipelineError]);
        }
        catch (e) {
            request.body.end();
            throw e;
        }
        finally {
            resolvePipeline();
        }
        return result;
    }
}
