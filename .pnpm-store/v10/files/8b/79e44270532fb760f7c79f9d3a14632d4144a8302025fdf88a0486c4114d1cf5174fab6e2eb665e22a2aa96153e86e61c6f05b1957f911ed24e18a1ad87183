import process from 'node:process';
import { ReadBuffer, serializeMessage } from '../shared/stdio.js';
/**
 * Server transport for stdio: this communicates with an MCP client by reading from the current process' stdin and writing to stdout.
 *
 * This transport is only available in Node.js environments.
 */
export class StdioServerTransport {
    constructor(_stdin = process.stdin, _stdout = process.stdout) {
        this._stdin = _stdin;
        this._stdout = _stdout;
        this._readBuffer = new ReadBuffer();
        this._started = false;
        // Arrow functions to bind `this` properly, while maintaining function identity.
        this._ondata = (chunk) => {
            this._readBuffer.append(chunk);
            this.processReadBuffer();
        };
        this._onerror = (error) => {
            this.onerror?.(error);
        };
    }
    /**
     * Starts listening for messages on stdin.
     */
    async start() {
        if (this._started) {
            throw new Error('StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.');
        }
        this._started = true;
        this._stdin.on('data', this._ondata);
        this._stdin.on('error', this._onerror);
    }
    processReadBuffer() {
        while (true) {
            try {
                const message = this._readBuffer.readMessage();
                if (message === null) {
                    break;
                }
                this.onmessage?.(message);
            }
            catch (error) {
                this.onerror?.(error);
            }
        }
    }
    async close() {
        // Remove our event listeners first
        this._stdin.off('data', this._ondata);
        this._stdin.off('error', this._onerror);
        // Check if we were the only data listener
        const remainingDataListeners = this._stdin.listenerCount('data');
        if (remainingDataListeners === 0) {
            // Only pause stdin if we were the only listener
            // This prevents interfering with other parts of the application that might be using stdin
            this._stdin.pause();
        }
        // Clear the buffer and notify closure
        this._readBuffer.clear();
        this.onclose?.();
    }
    send(message) {
        return new Promise(resolve => {
            const json = serializeMessage(message);
            if (this._stdout.write(json)) {
                resolve();
            }
            else {
                this._stdout.once('drain', resolve);
            }
        });
    }
}
//# sourceMappingURL=stdio.js.map