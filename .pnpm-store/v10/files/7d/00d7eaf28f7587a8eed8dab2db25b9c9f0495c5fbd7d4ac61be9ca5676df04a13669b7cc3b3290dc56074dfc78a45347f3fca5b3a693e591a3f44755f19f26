import type { UpgradeWebSocket, WSEvents } from '../../helper/websocket';
import { WSContext } from '../../helper/websocket';
/**
 * @internal
 */
export interface BunServerWebSocket<T> {
    send(data: string | ArrayBuffer | Uint8Array, compress?: boolean): void;
    close(code?: number, reason?: string): void;
    data: T;
    readyState: 0 | 1 | 2 | 3;
}
export interface BunWebSocketHandler<T> {
    open(ws: BunServerWebSocket<T>): void;
    close(ws: BunServerWebSocket<T>, code?: number, reason?: string): void;
    message(ws: BunServerWebSocket<T>, message: string | {
        buffer: ArrayBufferLike;
    }): void;
}
interface CreateWebSocket<T> {
    upgradeWebSocket: UpgradeWebSocket<T>;
    websocket: BunWebSocketHandler<BunWebSocketData>;
}
export interface BunWebSocketData {
    events: WSEvents;
    url: URL;
    protocol: string;
}
/**
 * @internal
 */
export declare const createWSContext: (ws: BunServerWebSocket<BunWebSocketData>) => WSContext;
export declare const upgradeWebSocket: UpgradeWebSocket<any>;
export declare const websocket: BunWebSocketHandler<BunWebSocketData>;
/**
 * @deprecated Import `upgradeWebSocket` and `websocket` directly from `hono/bun` instead.
 * @returns A function to create a Bun WebSocket handler.
 */
export declare const createBunWebSocket: <T>() => CreateWebSocket<T>;
export {};
