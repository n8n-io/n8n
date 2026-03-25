// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AvroReadable } from "./AvroReadable";
import { AbortError } from "@azure/abort-controller";
const ABORT_ERROR = new AbortError("Reading from the avro blob was aborted.");
export class AvroReadableFromBlob extends AvroReadable {
    constructor(blob) {
        super();
        this._blob = blob;
        this._position = 0;
    }
    get position() {
        return this._position;
    }
    async read(size, options = {}) {
        size = Math.min(size, this._blob.size - this._position);
        if (size <= 0) {
            return new Uint8Array();
        }
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            function cleanUp() {
                if (options.abortSignal) {
                    options.abortSignal.removeEventListener("abort", abortHandler);
                }
            }
            function abortHandler() {
                fileReader.abort();
                cleanUp();
                reject(ABORT_ERROR);
            }
            if (options.abortSignal) {
                options.abortSignal.addEventListener("abort", abortHandler);
            }
            fileReader.onloadend = (ev) => {
                cleanUp();
                resolve(new Uint8Array(ev.target.result));
            };
            fileReader.onerror = () => {
                cleanUp();
                reject();
            };
            fileReader.readAsArrayBuffer(this._blob.slice(this._position, (this._position += size)));
        });
    }
}
//# sourceMappingURL=AvroReadableFromBlob.js.map