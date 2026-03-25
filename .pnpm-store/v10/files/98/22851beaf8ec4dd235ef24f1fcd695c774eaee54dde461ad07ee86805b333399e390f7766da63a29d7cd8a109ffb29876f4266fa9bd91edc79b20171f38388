/// <reference types="node" />

import { EventEmitter } from "events";
import {
    Agent,
    ClientRequest,
    ClientRequestArgs,
    IncomingMessage,
    OutgoingHttpHeaders,
    Server as HTTPServer,
} from "http";
import { Server as HTTPSServer } from "https";
import { createConnection } from "net";
import { Duplex, DuplexOptions } from "stream";
import { SecureContextOptions } from "tls";
import { URL } from "url";
import { ZlibOptions } from "zlib";

// can not get all overload of BufferConstructor['from'], need to copy all it's first arguments here
// https://github.com/microsoft/TypeScript/issues/32164
type BufferLike =
    | string
    | Buffer
    | DataView
    | number
    | ArrayBufferView
    | Uint8Array
    | ArrayBuffer
    | SharedArrayBuffer
    | Blob
    | readonly any[]
    | readonly number[]
    | { valueOf(): ArrayBuffer }
    | { valueOf(): SharedArrayBuffer }
    | { valueOf(): Uint8Array }
    | { valueOf(): readonly number[] }
    | { valueOf(): string }
    | { [Symbol.toPrimitive](hint: string): string };

// WebSocket socket.
declare class WebSocket extends EventEmitter {
    /** The connection is not yet open. */
    static readonly CONNECTING: 0;
    /** The connection is open and ready to communicate. */
    static readonly OPEN: 1;
    /** The connection is in the process of closing. */
    static readonly CLOSING: 2;
    /** The connection is closed. */
    static readonly CLOSED: 3;

    binaryType: "nodebuffer" | "arraybuffer" | "fragments";
    readonly bufferedAmount: number;
    readonly extensions: string;
    /** Indicates whether the websocket is paused */
    readonly isPaused: boolean;
    readonly protocol: string;
    /** The current state of the connection */
    readonly readyState:
        | typeof WebSocket.CONNECTING
        | typeof WebSocket.OPEN
        | typeof WebSocket.CLOSING
        | typeof WebSocket.CLOSED;
    readonly url: string;

    /** The connection is not yet open. */
    readonly CONNECTING: 0;
    /** The connection is open and ready to communicate. */
    readonly OPEN: 1;
    /** The connection is in the process of closing. */
    readonly CLOSING: 2;
    /** The connection is closed. */
    readonly CLOSED: 3;

    onopen: ((event: WebSocket.Event) => void) | null;
    onerror: ((event: WebSocket.ErrorEvent) => void) | null;
    onclose: ((event: WebSocket.CloseEvent) => void) | null;
    onmessage: ((event: WebSocket.MessageEvent) => void) | null;

    constructor(address: null);
    constructor(address: string | URL, options?: WebSocket.ClientOptions | ClientRequestArgs);
    constructor(
        address: string | URL,
        protocols?: string | string[],
        options?: WebSocket.ClientOptions | ClientRequestArgs,
    );

    close(code?: number, data?: string | Buffer): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    // https://github.com/websockets/ws/issues/2076#issuecomment-1250354722
    send(data: BufferLike, cb?: (err?: Error) => void): void;
    send(
        data: BufferLike,
        options: {
            mask?: boolean | undefined;
            binary?: boolean | undefined;
            compress?: boolean | undefined;
            fin?: boolean | undefined;
        },
        cb?: (err?: Error) => void,
    ): void;
    terminate(): void;

    /**
     * Pause the websocket causing it to stop emitting events. Some events can still be
     * emitted after this is called, until all buffered data is consumed. This method
     * is a noop if the ready state is `CONNECTING` or `CLOSED`.
     */
    pause(): void;
    /**
     * Make a paused socket resume emitting events. This method is a noop if the ready
     * state is `CONNECTING` or `CLOSED`.
     */
    resume(): void;

    // HTML5 WebSocket events
    addEventListener<K extends keyof WebSocket.WebSocketEventMap>(
        type: K,
        listener:
            | ((event: WebSocket.WebSocketEventMap[K]) => void)
            | { handleEvent(event: WebSocket.WebSocketEventMap[K]): void },
        options?: WebSocket.EventListenerOptions,
    ): void;
    removeEventListener<K extends keyof WebSocket.WebSocketEventMap>(
        type: K,
        listener:
            | ((event: WebSocket.WebSocketEventMap[K]) => void)
            | { handleEvent(event: WebSocket.WebSocketEventMap[K]): void },
    ): void;

    // Events
    on(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
    on(event: "error", listener: (this: WebSocket, error: Error) => void): this;
    on(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
    on(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
    on(event: "open", listener: (this: WebSocket) => void): this;
    on(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
    on(event: "redirect", listener: (this: WebSocket, url: string, request: ClientRequest) => void): this;
    on(
        event: "unexpected-response",
        listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
    ): this;
    on(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

    once(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
    once(event: "error", listener: (this: WebSocket, error: Error) => void): this;
    once(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
    once(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
    once(event: "open", listener: (this: WebSocket) => void): this;
    once(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
    once(event: "redirect", listener: (this: WebSocket, url: string, request: ClientRequest) => void): this;
    once(
        event: "unexpected-response",
        listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
    ): this;
    once(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

    off(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
    off(event: "error", listener: (this: WebSocket, error: Error) => void): this;
    off(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
    off(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
    off(event: "open", listener: (this: WebSocket) => void): this;
    off(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
    off(event: "redirect", listener: (this: WebSocket, url: string, request: ClientRequest) => void): this;
    off(
        event: "unexpected-response",
        listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
    ): this;
    off(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

    addListener(event: "close", listener: (code: number, reason: Buffer) => void): this;
    addListener(event: "error", listener: (error: Error) => void): this;
    addListener(event: "upgrade", listener: (request: IncomingMessage) => void): this;
    addListener(event: "message", listener: (data: WebSocket.RawData, isBinary: boolean) => void): this;
    addListener(event: "open", listener: () => void): this;
    addListener(event: "ping" | "pong", listener: (data: Buffer) => void): this;
    addListener(event: "redirect", listener: (url: string, request: ClientRequest) => void): this;
    addListener(
        event: "unexpected-response",
        listener: (request: ClientRequest, response: IncomingMessage) => void,
    ): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;

    removeListener(event: "close", listener: (code: number, reason: Buffer) => void): this;
    removeListener(event: "error", listener: (error: Error) => void): this;
    removeListener(event: "upgrade", listener: (request: IncomingMessage) => void): this;
    removeListener(event: "message", listener: (data: WebSocket.RawData, isBinary: boolean) => void): this;
    removeListener(event: "open", listener: () => void): this;
    removeListener(event: "ping" | "pong", listener: (data: Buffer) => void): this;
    removeListener(event: "redirect", listener: (url: string, request: ClientRequest) => void): this;
    removeListener(
        event: "unexpected-response",
        listener: (request: ClientRequest, response: IncomingMessage) => void,
    ): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

declare const WebSocketAlias: typeof WebSocket;
interface WebSocketAlias extends WebSocket {} // eslint-disable-line @typescript-eslint/no-empty-interface

declare namespace WebSocket {
    /**
     * Data represents the raw message payload received over the WebSocket.
     */
    type RawData = Buffer | ArrayBuffer | Buffer[];

    /**
     * Data represents the message payload received over the WebSocket.
     */
    type Data = string | Buffer | ArrayBuffer | Buffer[];

    /**
     * CertMeta represents the accepted types for certificate & key data.
     */
    type CertMeta = string | string[] | Buffer | Buffer[];

    /**
     * VerifyClientCallbackSync is a synchronous callback used to inspect the
     * incoming message. The return value (boolean) of the function determines
     * whether or not to accept the handshake.
     */
    type VerifyClientCallbackSync<Request extends IncomingMessage = IncomingMessage> = (info: {
        origin: string;
        secure: boolean;
        req: Request;
    }) => boolean;

    /**
     * VerifyClientCallbackAsync is an asynchronous callback used to inspect the
     * incoming message. The return value (boolean) of the function determines
     * whether or not to accept the handshake.
     */
    type VerifyClientCallbackAsync<Request extends IncomingMessage = IncomingMessage> = (
        info: { origin: string; secure: boolean; req: Request },
        callback: (res: boolean, code?: number, message?: string, headers?: OutgoingHttpHeaders) => void,
    ) => void;

    /**
     * FinishRequestCallback is a callback for last minute customization of the
     * headers. If finishRequest is set, then it has the responsibility to call
     * request.end() once it is done setting request headers.
     */
    type FinishRequestCallback = (request: ClientRequest, websocket: WebSocket) => void;

    interface ClientOptions extends SecureContextOptions {
        protocol?: string | undefined;
        followRedirects?: boolean | undefined;
        generateMask?(mask: Buffer): void;
        handshakeTimeout?: number | undefined;
        maxRedirects?: number | undefined;
        perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
        localAddress?: string | undefined;
        protocolVersion?: number | undefined;
        headers?: { [key: string]: string } | undefined;
        origin?: string | undefined;
        agent?: Agent | undefined;
        host?: string | undefined;
        family?: number | undefined;
        checkServerIdentity?(servername: string, cert: CertMeta): boolean;
        rejectUnauthorized?: boolean | undefined;
        allowSynchronousEvents?: boolean | undefined;
        autoPong?: boolean | undefined;
        maxPayload?: number | undefined;
        skipUTF8Validation?: boolean | undefined;
        createConnection?: typeof createConnection | undefined;
        finishRequest?: FinishRequestCallback | undefined;
    }

    interface PerMessageDeflateOptions {
        serverNoContextTakeover?: boolean | undefined;
        clientNoContextTakeover?: boolean | undefined;
        serverMaxWindowBits?: number | undefined;
        clientMaxWindowBits?: number | undefined;
        zlibDeflateOptions?: {
            flush?: number | undefined;
            finishFlush?: number | undefined;
            chunkSize?: number | undefined;
            windowBits?: number | undefined;
            level?: number | undefined;
            memLevel?: number | undefined;
            strategy?: number | undefined;
            dictionary?: Buffer | Buffer[] | DataView | undefined;
            info?: boolean | undefined;
        } | undefined;
        zlibInflateOptions?: ZlibOptions | undefined;
        threshold?: number | undefined;
        concurrencyLimit?: number | undefined;
    }

    interface Event {
        type: string;
        target: WebSocket;
    }

    interface ErrorEvent {
        error: any;
        message: string;
        type: string;
        target: WebSocket;
    }

    interface CloseEvent {
        wasClean: boolean;
        code: number;
        reason: string;
        type: string;
        target: WebSocket;
    }

    interface MessageEvent {
        data: Data;
        type: string;
        target: WebSocket;
    }

    interface WebSocketEventMap {
        open: Event;
        error: ErrorEvent;
        close: CloseEvent;
        message: MessageEvent;
    }

    interface EventListenerOptions {
        once?: boolean | undefined;
    }

    interface ServerOptions<
        U extends typeof WebSocket.WebSocket = typeof WebSocket.WebSocket,
        V extends typeof IncomingMessage = typeof IncomingMessage,
    > {
        host?: string | undefined;
        port?: number | undefined;
        backlog?: number | undefined;
        server?: HTTPServer<V> | HTTPSServer<V> | undefined;
        verifyClient?:
            | VerifyClientCallbackAsync<InstanceType<V>>
            | VerifyClientCallbackSync<InstanceType<V>>
            | undefined;
        handleProtocols?: (protocols: Set<string>, request: InstanceType<V>) => string | false;
        path?: string | undefined;
        noServer?: boolean | undefined;
        allowSynchronousEvents?: boolean | undefined;
        autoPong?: boolean | undefined;
        clientTracking?: boolean | undefined;
        perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
        maxPayload?: number | undefined;
        skipUTF8Validation?: boolean | undefined;
        WebSocket?: U | undefined;
    }

    interface AddressInfo {
        address: string;
        family: string;
        port: number;
    }

    // WebSocket Server
    class Server<
        T extends typeof WebSocket.WebSocket = typeof WebSocket.WebSocket,
        U extends typeof IncomingMessage = typeof IncomingMessage,
    > extends EventEmitter {
        options: ServerOptions<T, U>;
        path: string;
        clients: Set<InstanceType<T>>;

        constructor(options?: ServerOptions<T, U>, callback?: () => void);

        address(): AddressInfo | string | null;
        close(cb?: (err?: Error) => void): void;
        handleUpgrade(
            request: InstanceType<U>,
            socket: Duplex,
            upgradeHead: Buffer,
            callback: (client: InstanceType<T>, request: InstanceType<U>) => void,
        ): void;
        shouldHandle(request: InstanceType<U>): boolean | Promise<boolean>;

        // Events
        on(
            event: "connection",
            cb: (this: Server<T>, websocket: InstanceType<T>, request: InstanceType<U>) => void,
        ): this;
        on(event: "error", cb: (this: Server<T>, error: Error) => void): this;
        on(event: "headers", cb: (this: Server<T>, headers: string[], request: InstanceType<U>) => void): this;
        on(event: "close" | "listening", cb: (this: Server<T>) => void): this;
        on(
            event: "wsClientError",
            cb: (this: Server<T>, error: Error, socket: Duplex, request: InstanceType<U>) => void,
        ): this;
        on(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

        once(
            event: "connection",
            cb: (this: Server<T>, websocket: InstanceType<T>, request: InstanceType<U>) => void,
        ): this;
        once(event: "error", cb: (this: Server<T>, error: Error) => void): this;
        once(event: "headers", cb: (this: Server<T>, headers: string[], request: InstanceType<U>) => void): this;
        once(event: "close" | "listening", cb: (this: Server<T>) => void): this;
        once(
            event: "wsClientError",
            cb: (this: Server<T>, error: Error, socket: Duplex, request: InstanceType<U>) => void,
        ): this;
        once(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

        off(
            event: "connection",
            cb: (this: Server<T>, socket: InstanceType<T>, request: InstanceType<U>) => void,
        ): this;
        off(event: "error", cb: (this: Server<T>, error: Error) => void): this;
        off(event: "headers", cb: (this: Server<T>, headers: string[], request: InstanceType<U>) => void): this;
        off(event: "close" | "listening", cb: (this: Server<T>) => void): this;
        off(
            event: "wsClientError",
            cb: (this: Server<T>, error: Error, socket: Duplex, request: InstanceType<U>) => void,
        ): this;
        off(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

        addListener(event: "connection", cb: (websocket: InstanceType<T>, request: InstanceType<U>) => void): this;
        addListener(event: "error", cb: (error: Error) => void): this;
        addListener(event: "headers", cb: (headers: string[], request: InstanceType<U>) => void): this;
        addListener(event: "close" | "listening", cb: () => void): this;
        addListener(event: "wsClientError", cb: (error: Error, socket: Duplex, request: InstanceType<U>) => void): this;
        addListener(event: string | symbol, listener: (...args: any[]) => void): this;

        removeListener(event: "connection", cb: (websocket: InstanceType<T>, request: InstanceType<U>) => void): this;
        removeListener(event: "error", cb: (error: Error) => void): this;
        removeListener(event: "headers", cb: (headers: string[], request: InstanceType<U>) => void): this;
        removeListener(event: "close" | "listening", cb: () => void): this;
        removeListener(
            event: "wsClientError",
            cb: (error: Error, socket: Duplex, request: InstanceType<U>) => void,
        ): this;
        removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    const WebSocketServer: typeof Server;
    interface WebSocketServer extends Server {} // eslint-disable-line @typescript-eslint/no-empty-interface
    const WebSocket: typeof WebSocketAlias;
    interface WebSocket extends WebSocketAlias {} // eslint-disable-line @typescript-eslint/no-empty-interface

    // WebSocket stream
    function createWebSocketStream(websocket: WebSocket, options?: DuplexOptions): Duplex;
}

export = WebSocket;
