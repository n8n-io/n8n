// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AbortError } from "@azure/abort-controller";
import { Readable } from "stream";
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * A Node.js ReadableStream will internally retry when internal ReadableStream unexpected ends.
 */
export class RetriableReadableStream extends Readable {
    /**
     * Creates an instance of RetriableReadableStream.
     *
     * @param source - The current ReadableStream returned from getter
     * @param getter - A method calling downloading request returning
     *                                      a new ReadableStream from specified offset
     * @param offset - Offset position in original data source to read
     * @param count - How much data in original data source to read
     * @param options -
     */
    constructor(source, getter, offset, count, options = {}) {
        super({ highWaterMark: options.highWaterMark });
        this.retries = 0;
        this.sourceDataHandler = (data) => {
            if (this.options.doInjectErrorOnce) {
                this.options.doInjectErrorOnce = undefined;
                this.source.pause();
                this.sourceErrorOrEndHandler();
                this.source.destroy();
                return;
            }
            // console.log(
            //   `Offset: ${this.offset}, Received ${data.length} from internal stream`
            // );
            this.offset += data.length;
            if (this.onProgress) {
                this.onProgress({ loadedBytes: this.offset - this.start });
            }
            if (!this.push(data)) {
                this.source.pause();
            }
        };
        this.sourceAbortedHandler = () => {
            const abortError = new AbortError("The operation was aborted.");
            this.destroy(abortError);
        };
        this.sourceErrorOrEndHandler = (err) => {
            if (err && err.name === "AbortError") {
                this.destroy(err);
                return;
            }
            // console.log(
            //   `Source stream emits end or error, offset: ${
            //     this.offset
            //   }, dest end : ${this.end}`
            // );
            this.removeSourceEventHandlers();
            if (this.offset - 1 === this.end) {
                this.push(null);
            }
            else if (this.offset <= this.end) {
                // console.log(
                //   `retries: ${this.retries}, max retries: ${this.maxRetries}`
                // );
                if (this.retries < this.maxRetryRequests) {
                    this.retries += 1;
                    this.getter(this.offset)
                        .then((newSource) => {
                        this.source = newSource;
                        this.setSourceEventHandlers();
                        return;
                    })
                        .catch((error) => {
                        this.destroy(error);
                    });
                }
                else {
                    this.destroy(new Error(`Data corruption failure: received less data than required and reached maxRetires limitation. Received data offset: ${this.offset - 1}, data needed offset: ${this.end}, retries: ${this.retries}, max retries: ${this.maxRetryRequests}`));
                }
            }
            else {
                this.destroy(new Error(`Data corruption failure: Received more data than original request, data needed offset is ${this.end}, received offset: ${this.offset - 1}`));
            }
        };
        this.getter = getter;
        this.source = source;
        this.start = offset;
        this.offset = offset;
        this.end = offset + count - 1;
        this.maxRetryRequests =
            options.maxRetryRequests && options.maxRetryRequests >= 0 ? options.maxRetryRequests : 0;
        this.onProgress = options.onProgress;
        this.options = options;
        this.setSourceEventHandlers();
    }
    _read() {
        this.source.resume();
    }
    setSourceEventHandlers() {
        this.source.on("data", this.sourceDataHandler);
        this.source.on("end", this.sourceErrorOrEndHandler);
        this.source.on("error", this.sourceErrorOrEndHandler);
        // needed for Node14
        this.source.on("aborted", this.sourceAbortedHandler);
    }
    removeSourceEventHandlers() {
        this.source.removeListener("data", this.sourceDataHandler);
        this.source.removeListener("end", this.sourceErrorOrEndHandler);
        this.source.removeListener("error", this.sourceErrorOrEndHandler);
        this.source.removeListener("aborted", this.sourceAbortedHandler);
    }
    _destroy(error, callback) {
        // remove listener from source and release source
        this.removeSourceEventHandlers();
        this.source.destroy();
        callback(error === null ? undefined : error);
    }
}
//# sourceMappingURL=RetriableReadableStream.js.map