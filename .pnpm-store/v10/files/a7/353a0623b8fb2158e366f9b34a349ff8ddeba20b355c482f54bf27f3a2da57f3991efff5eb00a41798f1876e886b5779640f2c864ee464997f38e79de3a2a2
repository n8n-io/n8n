// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { BuffersStream } from "./BuffersStream";
/**
 * maxBufferLength is max size of each buffer in the pooled buffers.
 */
import buffer from "buffer";
const maxBufferLength = buffer.constants.MAX_LENGTH;
/**
 * This class provides a buffer container which conceptually has no hard size limit.
 * It accepts a capacity, an array of input buffers and the total length of input data.
 * It will allocate an internal "buffer" of the capacity and fill the data in the input buffers
 * into the internal "buffer" serially with respect to the total length.
 * Then by calling PooledBuffer.getReadableStream(), you can get a readable stream
 * assembled from all the data in the internal "buffer".
 */
export class PooledBuffer {
    /**
     * The size of the data contained in the pooled buffers.
     */
    get size() {
        return this._size;
    }
    constructor(capacity, buffers, totalLength) {
        /**
         * Internal buffers used to keep the data.
         * Each buffer has a length of the maxBufferLength except last one.
         */
        this.buffers = [];
        this.capacity = capacity;
        this._size = 0;
        // allocate
        const bufferNum = Math.ceil(capacity / maxBufferLength);
        for (let i = 0; i < bufferNum; i++) {
            let len = i === bufferNum - 1 ? capacity % maxBufferLength : maxBufferLength;
            if (len === 0) {
                len = maxBufferLength;
            }
            this.buffers.push(Buffer.allocUnsafe(len));
        }
        if (buffers) {
            this.fill(buffers, totalLength);
        }
    }
    /**
     * Fill the internal buffers with data in the input buffers serially
     * with respect to the total length and the total capacity of the internal buffers.
     * Data copied will be shift out of the input buffers.
     *
     * @param buffers - Input buffers containing the data to be filled in the pooled buffer
     * @param totalLength - Total length of the data to be filled in.
     *
     */
    fill(buffers, totalLength) {
        this._size = Math.min(this.capacity, totalLength);
        let i = 0, j = 0, targetOffset = 0, sourceOffset = 0, totalCopiedNum = 0;
        while (totalCopiedNum < this._size) {
            const source = buffers[i];
            const target = this.buffers[j];
            const copiedNum = source.copy(target, targetOffset, sourceOffset);
            totalCopiedNum += copiedNum;
            sourceOffset += copiedNum;
            targetOffset += copiedNum;
            if (sourceOffset === source.length) {
                i++;
                sourceOffset = 0;
            }
            if (targetOffset === target.length) {
                j++;
                targetOffset = 0;
            }
        }
        // clear copied from source buffers
        buffers.splice(0, i);
        if (buffers.length > 0) {
            buffers[0] = buffers[0].slice(sourceOffset);
        }
    }
    /**
     * Get the readable stream assembled from all the data in the internal buffers.
     *
     */
    getReadableStream() {
        return new BuffersStream(this.buffers, this.size);
    }
}
//# sourceMappingURL=PooledBuffer.js.map