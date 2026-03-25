import { h as Interceptor, H as HttpRequestEventMap } from '../../Interceptor-436630be.js';
import net from 'node:net';
import '@open-draft/deferred-promise';
import '@open-draft/logger';
import 'strict-event-emitter';

type WriteCallback = (error?: Error | null) => void;

interface MockSocketOptions {
    write: (chunk: Buffer | string, encoding: BufferEncoding | undefined, callback?: WriteCallback) => void;
    read: (chunk: Buffer, encoding: BufferEncoding | undefined) => void;
}
declare class MockSocket extends net.Socket {
    protected readonly options: MockSocketOptions;
    connecting: boolean;
    constructor(options: MockSocketOptions);
    connect(): this;
    write(...args: Array<unknown>): boolean;
    end(...args: Array<unknown>): this;
    push(chunk: any, encoding?: BufferEncoding): boolean;
}

type HttpConnectionOptions = any;
type MockHttpSocketRequestCallback = (args: {
    requestId: string;
    request: Request;
    socket: MockHttpSocket;
}) => void;
type MockHttpSocketResponseCallback = (args: {
    requestId: string;
    request: Request;
    response: Response;
    isMockedResponse: boolean;
    socket: MockHttpSocket;
}) => Promise<void>;
interface MockHttpSocketOptions {
    connectionOptions: HttpConnectionOptions;
    createConnection: () => net.Socket;
    onRequest: MockHttpSocketRequestCallback;
    onResponse: MockHttpSocketResponseCallback;
}
declare class MockHttpSocket extends MockSocket {
    private connectionOptions;
    private createConnection;
    private baseUrl;
    private onRequest;
    private onResponse;
    private responseListenersPromise?;
    private writeBuffer;
    private request?;
    private requestParser;
    private requestStream?;
    private shouldKeepAlive?;
    private socketState;
    private responseParser;
    private responseStream?;
    private originalSocket?;
    constructor(options: MockHttpSocketOptions);
    emit(event: string | symbol, ...args: any[]): boolean;
    destroy(error?: Error | undefined): this;
    /**
     * Establish this Socket connection as-is and pipe
     * its data/events through this Socket.
     */
    passthrough(): void;
    /**
     * Convert the given Fetch API `Response` instance to an
     * HTTP message and push it to the socket.
     */
    respondWith(response: Response): Promise<void>;
    /**
     * Close this socket connection with the given error.
     */
    errorWith(error?: Error): void;
    private mockConnect;
    private flushWriteBuffer;
    private onRequestStart;
    private onRequestBody;
    private onRequestEnd;
    private onResponseStart;
    private onResponseBody;
    private onResponseEnd;
}

declare class ClientRequestInterceptor extends Interceptor<HttpRequestEventMap> {
    static symbol: symbol;
    constructor();
    protected setup(): void;
    private onRequest;
    onResponse: MockHttpSocketResponseCallback;
}

export { ClientRequestInterceptor };
