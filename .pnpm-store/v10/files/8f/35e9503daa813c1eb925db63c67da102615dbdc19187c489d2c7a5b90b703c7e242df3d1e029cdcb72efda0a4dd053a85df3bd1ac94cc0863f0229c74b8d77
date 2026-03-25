// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { EventEmitter } from "events";
import { PooledBuffer } from "./PooledBuffer";
/**
 * This class accepts a Node.js Readable stream as input, and keeps reading data
 * from the stream into the internal buffer structure, until it reaches maxBuffers.
 * Every available buffer will try to trigger outgoingHandler.
 *
 * The internal buffer structure includes an incoming buffer array, and a outgoing
 * buffer array. The incoming buffer array includes the "empty" buffers can be filled
 * with new incoming data. The outgoing array includes the filled buffers to be
 * handled by outgoingHandler. Every above buffer size is defined by parameter bufferSize.
 *
 * NUM_OF_ALL_BUFFERS = BUFFERS_IN_INCOMING + BUFFERS_IN_OUTGOING + BUFFERS_UNDER_HANDLING
 *
 * NUM_OF_ALL_BUFFERS lesser than or equal to maxBuffers
 *
 * PERFORMANCE IMPROVEMENT TIPS:
 * 1. Input stream highWaterMark is better to set a same value with bufferSize
 *    parameter, which will avoid Buffer.concat() operations.
 * 2. concurrency should set a smaller value than maxBuffers, which is helpful to
 *    reduce the possibility when a outgoing handler waits for the stream data.
 *    in this situation, outgoing handlers are blocked.
 *    Outgoing queue shouldn't be empty.
 */
export class BufferScheduler {
    /**
     * Creates an instance of BufferScheduler.
     *
     * @param readable - A Node.js Readable stream
     * @param bufferSize - Buffer size of every maintained buffer
     * @param maxBuffers - How many buffers can be allocated
     * @param outgoingHandler - An async function scheduled to be
     *                                          triggered when a buffer fully filled
     *                                          with stream data
     * @param concurrency - Concurrency of executing outgoingHandlers (>0)
     * @param encoding - [Optional] Encoding of Readable stream when it's a string stream
     */
    constructor(readable, bufferSize, maxBuffers, outgoingHandler, concurrency, encoding) {
        /**
         * An internal event emitter.
         */
        this.emitter = new EventEmitter();
        /**
         * An internal offset marker to track data offset in bytes of next outgoingHandler.
         */
        this.offset = 0;
        /**
         * An internal marker to track whether stream is end.
         */
        this.isStreamEnd = false;
        /**
         * An internal marker to track whether stream or outgoingHandler returns error.
         */
        this.isError = false;
        /**
         * How many handlers are executing.
         */
        this.executingOutgoingHandlers = 0;
        /**
         * How many buffers have been allocated.
         */
        this.numBuffers = 0;
        /**
         * Because this class doesn't know how much data every time stream pops, which
         * is defined by highWaterMarker of the stream. So BufferScheduler will cache
         * data received from the stream, when data in unresolvedDataArray exceeds the
         * blockSize defined, it will try to concat a blockSize of buffer, fill into available
         * buffers from incoming and push to outgoing array.
         */
        this.unresolvedDataArray = [];
        /**
         * How much data consisted in unresolvedDataArray.
         */
        this.unresolvedLength = 0;
        /**
         * The array includes all the available buffers can be used to fill data from stream.
         */
        this.incoming = [];
        /**
         * The array (queue) includes all the buffers filled from stream data.
         */
        this.outgoing = [];
        if (bufferSize <= 0) {
            throw new RangeError(`bufferSize must be larger than 0, current is ${bufferSize}`);
        }
        if (maxBuffers <= 0) {
            throw new RangeError(`maxBuffers must be larger than 0, current is ${maxBuffers}`);
        }
        if (concurrency <= 0) {
            throw new RangeError(`concurrency must be larger than 0, current is ${concurrency}`);
        }
        this.bufferSize = bufferSize;
        this.maxBuffers = maxBuffers;
        this.readable = readable;
        this.outgoingHandler = outgoingHandler;
        this.concurrency = concurrency;
        this.encoding = encoding;
    }
    /**
     * Start the scheduler, will return error when stream of any of the outgoingHandlers
     * returns error.
     *
     */
    async do() {
        return new Promise((resolve, reject) => {
            this.readable.on("data", (data) => {
                data = typeof data === "string" ? Buffer.from(data, this.encoding) : data;
                this.appendUnresolvedData(data);
                if (!this.resolveData()) {
                    this.readable.pause();
                }
            });
            this.readable.on("error", (err) => {
                this.emitter.emit("error", err);
            });
            this.readable.on("end", () => {
                this.isStreamEnd = true;
                this.emitter.emit("checkEnd");
            });
            this.emitter.on("error", (err) => {
                this.isError = true;
                this.readable.pause();
                reject(err);
            });
            this.emitter.on("checkEnd", () => {
                if (this.outgoing.length > 0) {
                    this.triggerOutgoingHandlers();
                    return;
                }
                if (this.isStreamEnd && this.executingOutgoingHandlers === 0) {
                    if (this.unresolvedLength > 0 && this.unresolvedLength < this.bufferSize) {
                        const buffer = this.shiftBufferFromUnresolvedDataArray();
                        this.outgoingHandler(() => buffer.getReadableStream(), buffer.size, this.offset)
                            .then(resolve)
                            .catch(reject);
                    }
                    else if (this.unresolvedLength >= this.bufferSize) {
                        return;
                    }
                    else {
                        resolve();
                    }
                }
            });
        });
    }
    /**
     * Insert a new data into unresolved array.
     *
     * @param data -
     */
    appendUnresolvedData(data) {
        this.unresolvedDataArray.push(data);
        this.unresolvedLength += data.length;
    }
    /**
     * Try to shift a buffer with size in blockSize. The buffer returned may be less
     * than blockSize when data in unresolvedDataArray is less than bufferSize.
     *
     */
    shiftBufferFromUnresolvedDataArray(buffer) {
        if (!buffer) {
            buffer = new PooledBuffer(this.bufferSize, this.unresolvedDataArray, this.unresolvedLength);
        }
        else {
            buffer.fill(this.unresolvedDataArray, this.unresolvedLength);
        }
        this.unresolvedLength -= buffer.size;
        return buffer;
    }
    /**
     * Resolve data in unresolvedDataArray. For every buffer with size in blockSize
     * shifted, it will try to get (or allocate a buffer) from incoming, and fill it,
     * then push it into outgoing to be handled by outgoing handler.
     *
     * Return false when available buffers in incoming are not enough, else true.
     *
     * @returns Return false when buffers in incoming are not enough, else true.
     */
    resolveData() {
        while (this.unresolvedLength >= this.bufferSize) {
            let buffer;
            if (this.incoming.length > 0) {
                buffer = this.incoming.shift();
                this.shiftBufferFromUnresolvedDataArray(buffer);
            }
            else {
                if (this.numBuffers < this.maxBuffers) {
                    buffer = this.shiftBufferFromUnresolvedDataArray();
                    this.numBuffers++;
                }
                else {
                    // No available buffer, wait for buffer returned
                    return false;
                }
            }
            this.outgoing.push(buffer);
            this.triggerOutgoingHandlers();
        }
        return true;
    }
    /**
     * Try to trigger a outgoing handler for every buffer in outgoing. Stop when
     * concurrency reaches.
     */
    async triggerOutgoingHandlers() {
        let buffer;
        do {
            if (this.executingOutgoingHandlers >= this.concurrency) {
                return;
            }
            buffer = this.outgoing.shift();
            if (buffer) {
                this.triggerOutgoingHandler(buffer);
            }
        } while (buffer);
    }
    /**
     * Trigger a outgoing handler for a buffer shifted from outgoing.
     *
     * @param buffer -
     */
    async triggerOutgoingHandler(buffer) {
        const bufferLength = buffer.size;
        this.executingOutgoingHandlers++;
        this.offset += bufferLength;
        try {
            await this.outgoingHandler(() => buffer.getReadableStream(), bufferLength, this.offset - bufferLength);
        }
        catch (err) {
            this.emitter.emit("error", err);
            return;
        }
        this.executingOutgoingHandlers--;
        this.reuseBuffer(buffer);
        this.emitter.emit("checkEnd");
    }
    /**
     * Return buffer used by outgoing handler into incoming.
     *
     * @param buffer -
     */
    reuseBuffer(buffer) {
        this.incoming.push(buffer);
        if (!this.isError && this.resolveData() && !this.isStreamEnd) {
            this.readable.resume();
        }
    }
}
//# sourceMappingURL=BufferScheduler.js.map