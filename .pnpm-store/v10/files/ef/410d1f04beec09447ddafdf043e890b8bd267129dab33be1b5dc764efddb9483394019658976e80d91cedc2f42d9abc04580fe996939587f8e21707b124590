import { CONNECTION_STATE } from './lib/constants';
import Serializer from './lib/serializer';
import Timer from './lib/timer';
import RealtimeChannel from './RealtimeChannel';
import type { RealtimeChannelOptions } from './RealtimeChannel';
type Fetch = typeof fetch;
export type Channel = {
    name: string;
    inserted_at: string;
    updated_at: string;
    id: number;
};
export type LogLevel = 'info' | 'warn' | 'error';
export type RealtimeMessage = {
    topic: string;
    event: string;
    payload: any;
    ref: string;
    join_ref?: string;
};
export type RealtimeRemoveChannelResponse = 'ok' | 'timed out' | 'error';
export type HeartbeatStatus = 'sent' | 'ok' | 'error' | 'timeout' | 'disconnected';
export interface WebSocketLikeConstructor {
    new (address: string | URL, _ignored?: any, options?: {
        headers: Object | undefined;
    }): WebSocketLike;
}
export type WebSocketLike = WebSocket | WSWebSocketDummy;
export interface WebSocketLikeError {
    error: any;
    message: string;
    type: string;
}
export type RealtimeClientOptions = {
    transport?: WebSocketLikeConstructor;
    timeout?: number;
    heartbeatIntervalMs?: number;
    logger?: Function;
    encode?: Function;
    decode?: Function;
    reconnectAfterMs?: Function;
    headers?: {
        [key: string]: string;
    };
    params?: {
        [key: string]: any;
    };
    log_level?: LogLevel;
    logLevel?: LogLevel;
    fetch?: Fetch;
    worker?: boolean;
    workerUrl?: string;
    accessToken?: () => Promise<string | null>;
};
export default class RealtimeClient {
    accessTokenValue: string | null;
    apiKey: string | null;
    channels: RealtimeChannel[];
    endPoint: string;
    httpEndpoint: string;
    headers?: {
        [key: string]: string;
    };
    params?: {
        [key: string]: string;
    };
    timeout: number;
    transport: WebSocketLikeConstructor | null;
    heartbeatIntervalMs: number;
    heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    pendingHeartbeatRef: string | null;
    heartbeatCallback: (status: HeartbeatStatus) => void;
    ref: number;
    reconnectTimer: Timer;
    logger: Function;
    logLevel?: LogLevel;
    encode: Function;
    decode: Function;
    reconnectAfterMs: Function;
    conn: WebSocketLike | null;
    sendBuffer: Function[];
    serializer: Serializer;
    stateChangeCallbacks: {
        open: Function[];
        close: Function[];
        error: Function[];
        message: Function[];
    };
    fetch: Fetch;
    accessToken: (() => Promise<string | null>) | null;
    worker?: boolean;
    workerUrl?: string;
    workerRef?: Worker;
    /**
     * Initializes the Socket.
     *
     * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
     * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
     * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
     * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
     * @param options.params The optional params to pass when connecting.
     * @param options.headers The optional headers to pass when connecting.
     * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
     * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
     * @param options.logLevel Sets the log level for Realtime
     * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
     * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
     * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
     * @param options.worker Use Web Worker to set a side flow. Defaults to false.
     * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
     */
    constructor(endPoint: string, options?: RealtimeClientOptions);
    /**
     * Connects the socket, unless already connected.
     */
    connect(): void;
    /**
     * Returns the URL of the websocket.
     * @returns string The URL of the websocket.
     */
    endpointURL(): string;
    /**
     * Disconnects the socket.
     *
     * @param code A numeric status code to send on disconnect.
     * @param reason A custom reason for the disconnect.
     */
    disconnect(code?: number, reason?: string): void;
    /**
     * Returns all created channels
     */
    getChannels(): RealtimeChannel[];
    /**
     * Unsubscribes and removes a single channel
     * @param channel A RealtimeChannel instance
     */
    removeChannel(channel: RealtimeChannel): Promise<RealtimeRemoveChannelResponse>;
    /**
     * Unsubscribes and removes all channels
     */
    removeAllChannels(): Promise<RealtimeRemoveChannelResponse[]>;
    /**
     * Logs the message.
     *
     * For customized logging, `this.logger` can be overridden.
     */
    log(kind: string, msg: string, data?: any): void;
    /**
     * Returns the current state of the socket.
     */
    connectionState(): CONNECTION_STATE;
    /**
     * Returns `true` is the connection is open.
     */
    isConnected(): boolean;
    channel(topic: string, params?: RealtimeChannelOptions): RealtimeChannel;
    /**
     * Push out a message if the socket is connected.
     *
     * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
     */
    push(data: RealtimeMessage): void;
    /**
     * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
     *
     * If param is null it will use the `accessToken` callback function or the token set on the client.
     *
     * On callback used, it will set the value of the token internal to the client.
     *
     * @param token A JWT string to override the token set on the client.
     */
    setAuth(token?: string | null): Promise<void>;
    /**
     * Sends a heartbeat message if the socket is connected.
     */
    sendHeartbeat(): Promise<void>;
    onHeartbeat(callback: (status: HeartbeatStatus) => void): void;
    /**
     * Flushes send buffer
     */
    flushSendBuffer(): void;
    private _workerObjectUrl;
}
declare class WSWebSocketDummy {
    binaryType: string;
    close: Function;
    onclose: Function;
    onerror: Function;
    onmessage: Function;
    onopen: Function;
    readyState: number;
    send: Function;
    url: string | URL | null;
    constructor(address: string, _protocols: undefined, options: {
        close: Function;
    });
}
export {};
//# sourceMappingURL=RealtimeClient.d.ts.map