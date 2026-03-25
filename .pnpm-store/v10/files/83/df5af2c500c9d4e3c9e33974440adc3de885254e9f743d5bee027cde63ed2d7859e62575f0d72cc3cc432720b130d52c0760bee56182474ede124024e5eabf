/**
 * @module
 * WebSocket Helper for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler, TypedResponse } from '../../types';
import type { StatusCode } from '../../utils/http-status';
/**
 * WebSocket Event Listeners type
 */
export interface WSEvents<T = unknown> {
    onOpen?: (evt: Event, ws: WSContext<T>) => void;
    onMessage?: (evt: MessageEvent<WSMessageReceive>, ws: WSContext<T>) => void;
    onClose?: (evt: CloseEvent, ws: WSContext<T>) => void;
    onError?: (evt: Event, ws: WSContext<T>) => void;
}
/**
 * Upgrade WebSocket Type
 */
export interface UpgradeWebSocket<T = unknown, U = any, _WSEvents = WSEvents<T>> {
    (createEvents: (c: Context) => _WSEvents | Promise<_WSEvents>, options?: U): MiddlewareHandler<any, string, {
        outputFormat: 'ws';
    }>;
    (c: Context, events: _WSEvents, options?: U): Promise<Response & TypedResponse<{}, StatusCode, 'ws'>>;
}
/**
 * ReadyState for WebSocket
 */
export type WSReadyState = 0 | 1 | 2 | 3;
/**
 * An argument for WSContext class
 */
export interface WSContextInit<T = unknown> {
    send(data: string | ArrayBuffer | Uint8Array, options: SendOptions): void;
    close(code?: number, reason?: string): void;
    raw?: T;
    readyState: WSReadyState;
    url?: string | URL | null;
    protocol?: string | null;
}
/**
 * Options for sending message
 */
export interface SendOptions {
    compress?: boolean;
}
/**
 * A context for controlling WebSockets
 */
export declare class WSContext<T = unknown> {
             
    constructor(init: WSContextInit<T>);
    send(source: string | ArrayBuffer | Uint8Array<ArrayBuffer>, options?: SendOptions): void;
    raw?: T;
    binaryType: BinaryType;
    get readyState(): WSReadyState;
    url: URL | null;
    protocol: string | null;
    close(code?: number, reason?: string): void;
}
export type WSMessageReceive = string | Blob | ArrayBufferLike;
export declare const createWSMessageEvent: (source: WSMessageReceive) => MessageEvent<WSMessageReceive>;
export interface WebSocketHelperDefineContext {
}
export type WebSocketHelperDefineHandler<T, U> = (c: Context, events: WSEvents<T>, options?: U) => Promise<Response | void> | Response | void;
/**
 * Create a WebSocket adapter/helper
 */
export declare const defineWebSocketHelper: <T = unknown, U = any>(handler: WebSocketHelperDefineHandler<T, U>) => UpgradeWebSocket<T, U>;
