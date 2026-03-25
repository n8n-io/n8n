import type { Context } from '../../context';
import { StreamingApi } from '../../utils/stream';
export interface SSEMessage {
    data: string | Promise<string>;
    event?: string;
    id?: string;
    retry?: number;
}
export declare class SSEStreamingApi extends StreamingApi {
    constructor(writable: WritableStream, readable: ReadableStream);
    writeSSE(message: SSEMessage): Promise<void>;
}
export declare const streamSSE: (c: Context, cb: (stream: SSEStreamingApi) => Promise<void>, onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>) => Response;
