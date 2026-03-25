// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AvroReadable } from "./AvroReadable";
import { AbortError } from "@azure/abort-controller";
const ABORT_ERROR = new AbortError("Reading from the avro stream was aborted.");
export class AvroReadableFromStream extends AvroReadable {
    toUint8Array(data) {
        if (typeof data === "string") {
            return Buffer.from(data);
        }
        return data;
    }
    constructor(readable) {
        super();
        this._readable = readable;
        this._position = 0;
    }
    get position() {
        return this._position;
    }
    async read(size, options = {}) {
        var _a;
        if ((_a = options.abortSignal) === null || _a === void 0 ? void 0 : _a.aborted) {
            throw ABORT_ERROR;
        }
        if (size < 0) {
            throw new Error(`size parameter should be positive: ${size}`);
        }
        if (size === 0) {
            return new Uint8Array();
        }
        if (!this._readable.readable) {
            throw new Error("Stream no longer readable.");
        }
        // See if there is already enough data.
        const chunk = this._readable.read(size);
        if (chunk) {
            this._position += chunk.length;
            // chunk.length maybe less than desired size if the stream ends.
            return this.toUint8Array(chunk);
        }
        else {
            // register callback to wait for enough data to read
            return new Promise((resolve, reject) => {
                /* eslint-disable @typescript-eslint/no-use-before-define */
                const cleanUp = () => {
                    this._readable.removeListener("readable", readableCallback);
                    this._readable.removeListener("error", rejectCallback);
                    this._readable.removeListener("end", rejectCallback);
                    this._readable.removeListener("close", rejectCallback);
                    if (options.abortSignal) {
                        options.abortSignal.removeEventListener("abort", abortHandler);
                    }
                };
                const readableCallback = () => {
                    const callbackChunk = this._readable.read(size);
                    if (callbackChunk) {
                        this._position += callbackChunk.length;
                        cleanUp();
                        // callbackChunk.length maybe less than desired size if the stream ends.
                        resolve(this.toUint8Array(callbackChunk));
                    }
                };
                const rejectCallback = () => {
                    cleanUp();
                    reject();
                };
                const abortHandler = () => {
                    cleanUp();
                    reject(ABORT_ERROR);
                };
                this._readable.on("readable", readableCallback);
                this._readable.once("error", rejectCallback);
                this._readable.once("end", rejectCallback);
                this._readable.once("close", rejectCallback);
                if (options.abortSignal) {
                    options.abortSignal.addEventListener("abort", abortHandler);
                }
                /* eslint-enable @typescript-eslint/no-use-before-define */
            });
        }
    }
}
//# sourceMappingURL=AvroReadableFromStream.js.map