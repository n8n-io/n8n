export declare function readChunks(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<Uint8Array>;
export declare function getLines(): (arr: Uint8Array) => Generator<[line: Uint8Array, fieldLength: number]>;
export declare function getMessages(): (line: Uint8Array, fieldLength: number) => Generator<[message?: EventSourceMessage | undefined, id?: string | undefined, retry?: number | undefined], any, unknown>;
export interface EventSourceMessage {
    /** The event ID to set the EventSource object's last event ID value. */
    id: string;
    /** A string identifying the type of event described. */
    event: string;
    /** The event data */
    data: string;
    /** The reconnection interval (in milliseconds) to wait before retrying the connection */
    retry?: number;
}
