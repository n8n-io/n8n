/**
 * Node.js HTTP Streamable HTTP Server Transport
 *
 * This is a thin wrapper around `WebStandardStreamableHTTPServerTransport` that provides
 * compatibility with Node.js HTTP server (IncomingMessage/ServerResponse).
 *
 * For web-standard environments (Cloudflare Workers, Deno, Bun), use `WebStandardStreamableHTTPServerTransport` directly.
 */
import { IncomingMessage, ServerResponse } from 'node:http';
import { Transport } from '../shared/transport.js';
import { AuthInfo } from './auth/types.js';
import { MessageExtraInfo, JSONRPCMessage, RequestId } from '../types.js';
import { WebStandardStreamableHTTPServerTransportOptions, EventStore, StreamId, EventId } from './webStandardStreamableHttp.js';
export type { EventStore, StreamId, EventId };
/**
 * Configuration options for StreamableHTTPServerTransport
 *
 * This is an alias for WebStandardStreamableHTTPServerTransportOptions for backward compatibility.
 */
export type StreamableHTTPServerTransportOptions = WebStandardStreamableHTTPServerTransportOptions;
/**
 * Server transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It supports both SSE streaming and direct HTTP responses.
 *
 * This is a wrapper around `WebStandardStreamableHTTPServerTransport` that provides Node.js HTTP compatibility.
 * It uses the `@hono/node-server` library to convert between Node.js HTTP and Web Standard APIs.
 *
 * Usage example:
 *
 * ```typescript
 * // Stateful mode - server sets the session ID
 * const statefulTransport = new StreamableHTTPServerTransport({
 *   sessionIdGenerator: () => randomUUID(),
 * });
 *
 * // Stateless mode - explicitly set session ID to undefined
 * const statelessTransport = new StreamableHTTPServerTransport({
 *   sessionIdGenerator: undefined,
 * });
 *
 * // Using with pre-parsed request body
 * app.post('/mcp', (req, res) => {
 *   transport.handleRequest(req, res, req.body);
 * });
 * ```
 *
 * In stateful mode:
 * - Session ID is generated and included in response headers
 * - Session ID is always included in initialization responses
 * - Requests with invalid session IDs are rejected with 404 Not Found
 * - Non-initialization requests without a session ID are rejected with 400 Bad Request
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No Session ID is included in any responses
 * - No session validation is performed
 */
export declare class StreamableHTTPServerTransport implements Transport {
    private _webStandardTransport;
    private _requestListener;
    private _requestContext;
    constructor(options?: StreamableHTTPServerTransportOptions);
    /**
     * Gets the session ID for this transport instance.
     */
    get sessionId(): string | undefined;
    /**
     * Sets callback for when the transport is closed.
     */
    set onclose(handler: (() => void) | undefined);
    get onclose(): (() => void) | undefined;
    /**
     * Sets callback for transport errors.
     */
    set onerror(handler: ((error: Error) => void) | undefined);
    get onerror(): ((error: Error) => void) | undefined;
    /**
     * Sets callback for incoming messages.
     */
    set onmessage(handler: ((message: JSONRPCMessage, extra?: MessageExtraInfo) => void) | undefined);
    get onmessage(): ((message: JSONRPCMessage, extra?: MessageExtraInfo) => void) | undefined;
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    start(): Promise<void>;
    /**
     * Closes the transport and all active connections.
     */
    close(): Promise<void>;
    /**
     * Sends a JSON-RPC message through the transport.
     */
    send(message: JSONRPCMessage, options?: {
        relatedRequestId?: RequestId;
    }): Promise<void>;
    /**
     * Handles an incoming HTTP request, whether GET or POST.
     *
     * This method converts Node.js HTTP objects to Web Standard Request/Response
     * and delegates to the underlying WebStandardStreamableHTTPServerTransport.
     *
     * @param req - Node.js IncomingMessage, optionally with auth property from middleware
     * @param res - Node.js ServerResponse
     * @param parsedBody - Optional pre-parsed body from body-parser middleware
     */
    handleRequest(req: IncomingMessage & {
        auth?: AuthInfo;
    }, res: ServerResponse, parsedBody?: unknown): Promise<void>;
    /**
     * Close an SSE stream for a specific request, triggering client reconnection.
     * Use this to implement polling behavior during long-running operations -
     * client will reconnect after the retry interval specified in the priming event.
     */
    closeSSEStream(requestId: RequestId): void;
    /**
     * Close the standalone GET SSE stream, triggering client reconnection.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream(): void;
}
//# sourceMappingURL=streamableHttp.d.ts.map