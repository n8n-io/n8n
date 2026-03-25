import { CookieJar } from "./http";

/**
 * Open WebSocket connection.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/connect/
 * @param url - Request URL.
 * @param callback - Logic to execute with socket.
 * @returns HTTP response to connection request.
 * @example
 * let res = ws.connect(url, function(socket) {
 *   socket.on('open', function() {
 *     console.log('WebSocket connection established!');
 *     socket.close();
 *   });
 * });
 */
export function connect(url: string, callback: Executor): Response;

/**
 * Open WebSocket connection.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/connect/
 * @param url - Request URL.
 * @param params - Request parameters.
 * @param callback - Logic to execute with socket.
 * @returns HTTP response to connection request.
 * @example
 * let res = ws.connect(url, { param1: true }, function(socket) {
 *   socket.on('open', function() {
 *     console.log('WebSocket connection established!');
 *     socket.close();
 *   });
 * });
 */
export function connect(url: string, params: Params | null, callback: Executor): Response;

// === Parameters ===
// ------------------

/**
 * Request parameters.
 */
export interface Params {
    /** Request headers. */
    headers?: { [name: string]: string };

    /**
     * Compression algorithm. The only supported algorithm is `deflate`.
     * If the option is left unset or empty, it defaults to no compression.
     */
    compression?: string;

    /** Response time metric tags. */
    tags?: { [name: string]: string };

    /**
     * The cookie jar that will be used when making the initial HTTP request to establish the WebSocket connection.
     * If empty, the default VU cookie jar will be used.
     */
    jar?: CookieJar;
}

/**
 * Socket executor.
 */
export interface Executor {
    /** @param socket - The opened socket. */
    (socket: Socket): void;
}

// === Response ===
// ----------------

/**
 * HTTP response to connection request.
 */
export interface Response {
    /** Fetched URL. May differ from request URL due to redirects. */
    url: string;

    /** HTTP status code. */
    status: number;

    /** Response headers. */
    headers: { [name: string]: string };

    /** Response body. */
    body: string;

    /** Non-HTTP error message. */
    error: string;
}

// === Socket ===
// --------------

/**
 * Created socket.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/
 */
export abstract class Socket {
    protected __brand: never;

    /**
     * Close connection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-close/
     * @param code - WebSocket status code.
     * @example
     * socket.close();
     */
    close(code?: number): void;

    /**
     * Listen to event.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-on/
     * @param event - Event type.
     * @param handler - Event handler.
     * @example
     * socket.on('message', function(message) {
     *   console.log(`Received message: ${message}`);
     * });
     * socket.on('close', function() {
     *   console.log('disconnected');
     * });
     */
    on<ET extends EventType>(event: ET, handler: EventHandler<ET>): void;

    /**
     * Send ping.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-ping/
     * @example
     * socket.ping();
     */
    ping(): void;

    /**
     * Send data.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-send/
     * @param data - Data to send.
     * @example
     * socket.send(JSON.stringify({ data: 'hola' }));
     */
    send(data: string): void;

    /**
     * Send data.
     * @param data - Data to send.
     * @example
     * const binFile = open('./file.pdf', 'b');
     * export default function () {
     *   ws.connect('http://wshost/', function(socket) {
     *     socket.on('open', function() {
     *       socket.sendBinary(binFile);
     *     });
     *     socket.on('binaryMessage', function(msg) {
     *       // msg is an ArrayBuffer, so we can wrap it in a typed array directly.
     *       new Uint8Array(msg);
     *     });
     *   });
     * }
     */
    sendBinary(data: ArrayBuffer): void;

    /**
     * Call a function repeatedly, while the WebSocket connection is open.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-setinterval/
     * @param handler - The function to call every `interval` milliseconds.
     * @param interval - Milliseconds between two calls to `callback`.
     * @example
     * socket.setInterval(function timeout() {
     *  socket.ping();
     *  console.log('Pinging every 1sec (setInterval test)');
     * }, 1000);
     */
    setInterval(handler: TimerHandler, interval: number): void;

    /**
     * Call a function at a later time,
     * if the WebSocket connection is still open then.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/socket-settimeout/
     * @param handler - The function to call when `delay` has expired.
     * @param delay - Delay in milliseconds.
     * @example
     * socket.setTimeout(function timeout() {
     *  console.log('Call after 1second');
     * }, 1000);
     */
    setTimeout(handler: TimerHandler, delay: number): void;
}

/**
 * Event type.
 */
export type EventType = "close" | "error" | "message" | "open" | "ping" | "pong" | "binaryMessage";

/**
 * Timer handler.
 */
export interface TimerHandler {
    (): void;
}

// === Event handlers ===
// ----------------------

/**
 * Event handler. Signature varies with event type.
 */
export type EventHandler<ET extends EventType> = ET extends "close" ? CloseEventHandler
    : ET extends "error" ? ErrorEventHandler
    : ET extends "message" ? MessageEventHandler
    : ET extends "binaryMessage" ? BinaryMessageEventHandler
    : ET extends "open" ? OpenEventHandler
    : ET extends "ping" ? PingEventHandler
    : ET extends "pong" ? PongEventHandler
    : never;

/**
 * Close event handler.
 */
export interface CloseEventHandler {
    /** @param code - WebSocket status code. */
    (code: number): void;
}

/**
 * Error event handler.
 */
export interface ErrorEventHandler {
    /** @param error - Error object. */
    (error: WebSocketError): void;
}

/**
 * Message event handler.
 */
export interface MessageEventHandler {
    /** @param message - Message. */
    (message: string): void;
}

/**
 * BinaryMessage event handler.
 */
export interface BinaryMessageEventHandler {
    /** @param message - Message. */
    (message: ArrayBuffer): void;
}

/**
 * Open event handler.
 */
export interface OpenEventHandler {
    (): void;
}

/**
 * Ping event handler.
 */
export interface PingEventHandler {
    (): void;
}

/**
 * Pong event handler.
 */
export interface PongEventHandler {
    (): void;
}

// === Error ===
// -------------

/**
 * Error.
 */
export abstract class WebSocketError {
    protected __brand: never;

    /** Error message. */
    error(): string;
}

/**
 * This module provides a WebSocket client implementing the WebSocket protocol.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/
 */
declare namespace ws {
    /**
     * Open WebSocket connection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/connect/
     * @param url - Request URL.
     * @param callback - Logic to execute with socket.
     * @returns HTTP response to connection request.
     * @example
     * let res = ws.connect(url, function(socket) {
     *   socket.on('open', function() {
     *     console.log('WebSocket connection established!');
     *     socket.close();
     *   });
     * });
     */
    function connect(url: string, callback: Executor): Response;

    /**
     * Open WebSocket connection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-ws/connect/
     * @param url - Request URL.
     * @param params - Request parameters.
     * @param callback - Logic to execute with socket.
     * @returns HTTP response to connection request.
     * @example
     * let res = ws.connect(url, { param1: true } , function(socket) {
     *   socket.on('open', function() {
     *     console.log('WebSocket connection established!');
     *     socket.close();
     *   });
     * });
     */
    function connect(url: string, params: Params | null, callback: Executor): Response;
}

export default ws;
