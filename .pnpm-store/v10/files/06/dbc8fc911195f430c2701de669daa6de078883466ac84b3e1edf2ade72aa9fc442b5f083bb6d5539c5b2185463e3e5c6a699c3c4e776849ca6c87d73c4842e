import { JSONRPCMessage } from '../types.js';
/**
 * Buffers a continuous stdio stream into discrete JSON-RPC messages.
 */
export declare class ReadBuffer {
    private _buffer?;
    append(chunk: Buffer): void;
    readMessage(): JSONRPCMessage | null;
    clear(): void;
}
export declare function deserializeMessage(line: string): JSONRPCMessage;
export declare function serializeMessage(message: JSONRPCMessage): string;
//# sourceMappingURL=stdio.d.ts.map