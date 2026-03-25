'use strict';

var eventstreamCodec = require('@smithy/eventstream-codec');
var stream = require('stream');

class EventSigningStream extends stream.Transform {
    priorSignature;
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    constructor(options) {
        super({
            autoDestroy: true,
            readableObjectMode: true,
            writableObjectMode: true,
            ...options,
        });
        this.priorSignature = options.priorSignature;
        this.eventStreamCodec = options.eventStreamCodec;
        this.messageSigner = options.messageSigner;
        this.systemClockOffsetProvider = options.systemClockOffsetProvider;
    }
    async _transform(chunk, encoding, callback) {
        try {
            const now = new Date(Date.now() + (await this.systemClockOffsetProvider()));
            const dateHeader = {
                ":date": { type: "timestamp", value: now },
            };
            const signedMessage = await this.messageSigner.sign({
                message: {
                    body: chunk,
                    headers: dateHeader,
                },
                priorSignature: this.priorSignature,
            }, {
                signingDate: now,
            });
            this.priorSignature = signedMessage.signature;
            const serializedSigned = this.eventStreamCodec.encode({
                headers: {
                    ...dateHeader,
                    ":chunk-signature": {
                        type: "binary",
                        value: getSignatureBinary(signedMessage.signature),
                    },
                },
                body: chunk,
            });
            this.push(serializedSigned);
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
}
function getSignatureBinary(signature) {
    const buf = Buffer.from(signature, "hex");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
}

class EventStreamPayloadHandler {
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    constructor(options) {
        this.messageSigner = options.messageSigner;
        this.eventStreamCodec = new eventstreamCodec.EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
        this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
    }
    async handle(next, args, context = {}) {
        const request = args.request;
        const { body: payload, query } = request;
        if (!(payload instanceof stream.Readable)) {
            throw new Error("Eventstream payload must be a Readable stream.");
        }
        const payloadStream = payload;
        request.body = new stream.PassThrough({
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
        stream.pipeline(payloadStream, signingStream, request.body, (err) => {
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

const eventStreamPayloadHandlerProvider = (options) => new EventStreamPayloadHandler(options);

exports.eventStreamPayloadHandlerProvider = eventStreamPayloadHandlerProvider;
