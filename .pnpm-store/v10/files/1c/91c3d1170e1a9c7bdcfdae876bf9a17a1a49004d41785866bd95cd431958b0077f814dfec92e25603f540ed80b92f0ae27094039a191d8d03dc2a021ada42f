import { Transform } from "stream";
export class EventSigningStream extends Transform {
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
