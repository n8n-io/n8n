import { Readable, Writable } from 'node:stream';
import { JSONRPCMessage } from '../types.js';
import { Transport } from '../shared/transport.js';
/**
 * Server transport for stdio: this communicates with an MCP client by reading from the current process' stdin and writing to stdout.
 *
 * This transport is only available in Node.js environments.
 */
export declare class StdioServerTransport implements Transport {
    private _stdin;
    private _stdout;
    private _readBuffer;
    private _started;
    constructor(_stdin?: Readable, _stdout?: Writable);
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    _ondata: (chunk: Buffer) => void;
    _onerror: (error: Error) => void;
    /**
     * Starts listening for messages on stdin.
     */
    start(): Promise<void>;
    private processReadBuffer;
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
}
//# sourceMappingURL=stdio.d.ts.map