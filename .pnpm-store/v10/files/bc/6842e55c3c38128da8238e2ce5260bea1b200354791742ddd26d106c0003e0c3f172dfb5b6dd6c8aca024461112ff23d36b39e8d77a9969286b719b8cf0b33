/**
 * WebSocket-based command execution for long-running commands.
 *
 * Uses the `ws` npm package (optional peer dependency).
 * Install with: npm install ws
 */
import type { WsMessage, WsRunOptions } from "./types.js";
type WsWebSocket = any;
/**
 * Convert a dataplane HTTP URL to a WebSocket URL for /execute/ws.
 */
export declare function buildWsUrl(dataplaneUrl: string): string;
/**
 * Build auth headers for the WebSocket upgrade request.
 */
export declare function buildAuthHeaders(apiKey: string | undefined): Record<string, string>;
/**
 * Control interface for an active WebSocket stream.
 *
 * Created before the async generator starts, bound to the WebSocket once
 * the connection opens. The CommandHandle holds a reference to this
 * object to send kill/input messages.
 */
export declare class WSStreamControl {
    private _ws;
    private _closed;
    private _killed;
    /** Bind to the active WebSocket. Called inside the generator. */
    _bind(ws: WsWebSocket): void;
    /** Mark as closed. Called when the generator exits. */
    _unbind(): void;
    /** True if kill() has been called on this stream. */
    get killed(): boolean;
    /** Send a kill message to abort the running command. */
    sendKill(): void;
    /** Send stdin data to the running command. */
    sendInput(data: string): void;
}
/**
 * Raise the appropriate exception from a server error message.
 */
export declare function raiseForWsError(msg: WsMessage, commandId?: string): never;
/**
 * Execute a command over WebSocket, yielding raw message dicts.
 *
 * Returns a tuple of [async_message_iterator, control]. The control object
 * provides sendKill() and sendInput() methods for the CommandHandle.
 *
 * The iterator yields WsMessage objects with a "type" field:
 * - { type: "started", command_id: "...", pid: N }
 * - { type: "stdout", data: "...", offset: N }
 * - { type: "stderr", data: "...", offset: N }
 * - { type: "exit", exit_code: N }
 *
 * If onStdout/onStderr callbacks are provided, they are invoked as
 * data arrives in addition to yielding the messages.
 */
export declare function runWsStream(dataplaneUrl: string, apiKey: string | undefined, command: string, options?: WsRunOptions): Promise<[AsyncIterableIterator<WsMessage>, WSStreamControl]>;
/**
 * Reconnect to an existing command over WebSocket.
 *
 * Returns a tuple of [async_message_iterator, control], same as runWsStream.
 * The iterator yields stdout, stderr, exit, and error messages.
 * No 'started' message is sent on reconnection.
 */
export declare function reconnectWsStream(dataplaneUrl: string, apiKey: string | undefined, commandId: string, options?: {
    stdoutOffset?: number;
    stderrOffset?: number;
}): Promise<[AsyncIterableIterator<WsMessage>, WSStreamControl]>;
export {};
