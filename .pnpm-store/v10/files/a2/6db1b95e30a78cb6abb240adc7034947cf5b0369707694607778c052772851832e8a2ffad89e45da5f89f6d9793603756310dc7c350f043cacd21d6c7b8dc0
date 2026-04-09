import { EndOfStreamError, AbortError } from "./Errors.js";
export class AbstractStreamReader {
    constructor() {
        this.endOfStream = false;
        this.interrupted = false;
        /**
         * Store peeked data
         * @type {Array}
         */
        this.peekQueue = [];
    }
    async peek(uint8Array, mayBeLess = false) {
        const bytesRead = await this.read(uint8Array, mayBeLess);
        this.peekQueue.push(uint8Array.subarray(0, bytesRead)); // Put read data back to peek buffer
        return bytesRead;
    }
    async read(buffer, mayBeLess = false) {
        if (buffer.length === 0) {
            return 0;
        }
        let bytesRead = this.readFromPeekBuffer(buffer);
        if (!this.endOfStream) {
            bytesRead += await this.readRemainderFromStream(buffer.subarray(bytesRead), mayBeLess);
        }
        if (bytesRead === 0 && !mayBeLess) {
            throw new EndOfStreamError();
        }
        return bytesRead;
    }
    /**
     * Read chunk from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @returns Number of bytes read
     */
    readFromPeekBuffer(buffer) {
        let remaining = buffer.length;
        let bytesRead = 0;
        // consume peeked data first
        while (this.peekQueue.length > 0 && remaining > 0) {
            const peekData = this.peekQueue.pop(); // Front of queue
            if (!peekData)
                throw new Error('peekData should be defined');
            const lenCopy = Math.min(peekData.length, remaining);
            buffer.set(peekData.subarray(0, lenCopy), bytesRead);
            bytesRead += lenCopy;
            remaining -= lenCopy;
            if (lenCopy < peekData.length) {
                // remainder back to queue
                this.peekQueue.push(peekData.subarray(lenCopy));
            }
        }
        return bytesRead;
    }
    async readRemainderFromStream(buffer, mayBeLess) {
        let bytesRead = 0;
        // Continue reading from stream if required
        while (bytesRead < buffer.length && !this.endOfStream) {
            if (this.interrupted) {
                throw new AbortError();
            }
            const chunkLen = await this.readFromStream(buffer.subarray(bytesRead), mayBeLess);
            if (chunkLen === 0)
                break;
            bytesRead += chunkLen;
        }
        if (!mayBeLess && bytesRead < buffer.length) {
            throw new EndOfStreamError();
        }
        return bytesRead;
    }
}
