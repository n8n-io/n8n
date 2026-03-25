import { CookieJar } from "../http";

/**
 * This module provides an experimental implementation of the WebSocket API
 * for k6.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/
 */

/**
 * The Websocket object provides the API for creating and managing WebSocket
 * connections as well as for sending and receiving data on the connection.
 */
export class WebSocket {
    protected __brand: never;

    /**
     * The absolute URL to which the Websocket connection is established.
     */
    readonly url: string;

    /**
     * The current state of the Websocket connection.
     */
    readonly readyState: ReadyState;

    /**
     * The number of bytes of data that have been queued using calls to send()
     * but not yet transmitted to the network.
     *
     * This value resets to zero once all queued data has been sent.
     * This value does not reset to zero when the connection is closed;
     * if you keep calling send(), this will continue to climb.
     */
    readonly bufferedAmount: number;

    /**
     * The type of binary data being transmitted over the connection.
     */
    readonly binaryType: BinaryType;

    /**
     * The Websocket constructor returns a newly created WebSocket object.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/
     *
     * @param url - The URL to which to connect; this should be the URL to which the WebSocket server will respond.
     * @param protocols - Either a single protocol string or an array of protocol strings. The param is reserved for future use and will be presently ignored.
     * @param params - Used for setting various WebSocket connection parameters such as headers, cookie jar, compression, etc.
     */
    constructor(url: string, protocols?: null, params?: Params | null);

    /**
     * Enqueues data to be transmitted to the server over the WebSocket connection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-send/
     *
     * @param data - the data to send to the server
     */
    send(data: string | ArrayBuffer): void;

    /**
     * Bind event names to event handlers to be executed when their
     * respective event is received by the server.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-addeventlistener/
     *
     * @param event - the event to listen for
     * @param listener - the callback to invoke when the event is emitted
     */
    addEventListener(event: EventName, listener: (event: MessageEvent | ErrorEvent) => void): void;

    /**
     * Closes the WebSocket connection or connection attempt, if any.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-close/
     *
     * @param code - An integer WebSocket connection close code value indicating a reason for closure.
     * @param reason - A human-readable string WebSocket connection close reason. No longer than 123 bytes of UTF-8 text.
     */
    close(code?: number, reason?: string): void;

    /**
     * Sends a ping message over the WebSocket connection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-ping/
     */
    ping(): void;

    /**
     * Sets an event handler which is invoked when a message event happens.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onmessage/
     *
     * @param event - the message event
     */
    onmessage: (event?: MessageEvent) => void;

    /**
     * Sets an event handler which is invoked when the WebSocket connection's opens.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onopen/
     */
    onopen: () => void;

    /**
     * Sets an event handler which is invoked when the WebSocket connection's closes.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onclose/
     */
    onclose: () => void;

    /**
     * Sets an event handler which is invoked when errors occur.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onerror/
     *
     * @param event - the error event
     */
    onerror: (event?: ErrorEvent) => void;

    /**
     * Sets an event handler which is invoked when a ping message is received.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onping/
     */
    onping: () => void;

    /**
     * Sets an event handler which is invoked when a pong message is received.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/websocket/websocket-onpong/
     */
    onpong: () => void;
}

/**
 * k6 specific WebSocket parameters.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/websockets/params/
 */
export interface Params {
    /** Request headers. */
    headers?: Record<string, string>;

    /**
     * Compression algorithm.
     * If the option is left unset, it defaults to no compression.
     */
    compression?: CompressionAlgorithm;

    /** The custom metric tags. */
    tags?: Record<string, number | string | boolean>;

    /**
     * The cookie jar that will be used when making the initial HTTP request to establish the WebSocket connection.
     * If empty, the default VU cookie jar will be used.
     */
    jar?: CookieJar;
}

/**
 * ReadyState describes the possible states of a WebSocket connection.
 */
export enum ReadyState {
    /**
     * Socket has been created. The connection is not yet open.
     */
    Connecting = 0,

    /**
     * The connection is open and ready to communicate.
     */
    Open = 1,

    /**
     * The connection is in the process of closing.
     */
    Closing = 2,

    /**
     * The connection is closed or couldn't be opened.
     */
    Closed = 3,
}

/**
 * BinaryType describes the possible types of binary data that can be
 * transmitted over a Websocket connection.
 */
export enum BinaryType {
    /**
     * Binary data is returned in ArrayBuffer form. k6 supports only this type.
     */
    ArrayBuffer = "arraybuffer",
}

/**
 * EventName describes the possible events that can be emitted
 * by a Websocket connection.
 */
export enum EventName {
    /**
     * Event fired when the connection is opened and ready to communicate.
     */
    Open = "open",

    /**
     * Event fired when the connection has been closed.
     */
    Close = "close",

    /**
     * Event fired when a connection has been closed due to an error.
     */
    Error = "error",

    /**
     * Event fired when a message has been received from the server.
     */
    Message = "message",

    /**
     * Event fired when a ping message has been received from the server.
     */
    Ping = "ping",

    /**
     * Event fired when a pong message has been received from the server.
     */
    Pong = "pong",
}

/**
 * MessageEvent is a simple interface that holds the data of a message received from the server.
 */
export interface MessageEvent {
    /**
     * The data sent by the message emitter.
     */
    data: string | ArrayBuffer;

    /**
     * the type of the event.
     */
    type: MessageType;

    /**
     * The read-only property that returns the time (in milliseconds) at which the event was created.
     */
    timestamp: number;
}

/**
 * WebSocket message types, as defined in RFC 6455, section 11.8.
 */
export enum MessageType {
    /**
     * The message is a text message. The text message payload is
     * interpreted as UTF-8 encodedtext data.
     */
    Text = 1,

    /**
     * The message is a binary message.
     */
    Binary = 2,

    /**
     * The message is a close control message. The optional message
     * payload contains a numeric code and a text reason.
     */
    Close = 8,

    /**
     * The message is a ping control message. The optional message
     * payload is UTF-8 encoded text.
     */
    PingMessage = 9,

    /**
     * The message is a pong control message. The optional message
     * payload is UTF-8 encoded text.
     */
    PongMessage = 10,
}

/**
 * ErrorEvent is a simple interface that holds the data of an error event.
 */
export interface ErrorEvent {
    /**
     * the type of the event.
     */
    type: MessageType;

    /**
     * The read-only property that returns the error message.
     */
    error: string;

    /**
     * The read-only property that returns the time (in milliseconds) at which the event was created.
     */
    timestamp: number;
}

/**
 * CompressionAlgorithm describes the possible compression algorithms.
 */
export enum CompressionAlgorithm {
    /**
     * Deflate compression algorithm.
     * k6 supports only this compression algorithm.
     */
    Deflate = "deflate",
}
