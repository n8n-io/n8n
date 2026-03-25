/**
 * Web Standards Streamable HTTP Server Transport
 *
 * This is the core transport implementation using Web Standard APIs (Request, Response, ReadableStream).
 * It can run on any runtime that supports Web Standards: Node.js 18+, Cloudflare Workers, Deno, Bun, etc.
 *
 * For Node.js Express/HTTP compatibility, use `StreamableHTTPServerTransport` which wraps this transport.
 */
import { Transport } from '../shared/transport.js';
import { AuthInfo } from './auth/types.js';
import { MessageExtraInfo, JSONRPCMessage, RequestId } from '../types.js';
export type StreamId = string;
export type EventId = string;
/**
 * Interface for resumability support via event storage
 */
export interface EventStore {
    /**
     * Stores an event for later retrieval
     * @param streamId ID of the stream the event belongs to
     * @param message The JSON-RPC message to store
     * @returns The generated event ID for the stored event
     */
    storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId>;
    /**
     * Get the stream ID associated with a given event ID.
     * @param eventId The event ID to look up
     * @returns The stream ID, or undefined if not found
     *
     * Optional: If not provided, the SDK will use the streamId returned by
     * replayEventsAfter for stream mapping.
     */
    getStreamIdForEventId?(eventId: EventId): Promise<StreamId | undefined>;
    replayEventsAfter(lastEventId: EventId, { send }: {
        send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
    }): Promise<StreamId>;
}
/**
 * Configuration options for WebStandardStreamableHTTPServerTransport
 */
export interface WebStandardStreamableHTTPServerTransportOptions {
    /**
     * Function that generates a session ID for the transport.
     * The session ID SHOULD be globally unique and cryptographically secure (e.g., a securely generated UUID, a JWT, or a cryptographic hash)
     *
     * If not provided, session management is disabled (stateless mode).
     */
    sessionIdGenerator?: () => string;
    /**
     * A callback for session initialization events
     * This is called when the server initializes a new session.
     * Useful in cases when you need to register multiple mcp sessions
     * and need to keep track of them.
     * @param sessionId The generated session ID
     */
    onsessioninitialized?: (sessionId: string) => void | Promise<void>;
    /**
     * A callback for session close events
     * This is called when the server closes a session due to a DELETE request.
     * Useful in cases when you need to clean up resources associated with the session.
     * Note that this is different from the transport closing, if you are handling
     * HTTP requests from multiple nodes you might want to close each
     * WebStandardStreamableHTTPServerTransport after a request is completed while still keeping the
     * session open/running.
     * @param sessionId The session ID that was closed
     */
    onsessionclosed?: (sessionId: string) => void | Promise<void>;
    /**
     * If true, the server will return JSON responses instead of starting an SSE stream.
     * This can be useful for simple request/response scenarios without streaming.
     * Default is false (SSE streams are preferred).
     */
    enableJsonResponse?: boolean;
    /**
     * Event store for resumability support
     * If provided, resumability will be enabled, allowing clients to reconnect and resume messages
     */
    eventStore?: EventStore;
    /**
     * List of allowed host header values for DNS rebinding protection.
     * If not specified, host validation is disabled.
     * @deprecated Use external middleware for host validation instead.
     */
    allowedHosts?: string[];
    /**
     * List of allowed origin header values for DNS rebinding protection.
     * If not specified, origin validation is disabled.
     * @deprecated Use external middleware for origin validation instead.
     */
    allowedOrigins?: string[];
    /**
     * Enable DNS rebinding protection (requires allowedHosts and/or allowedOrigins to be configured).
     * Default is false for backwards compatibility.
     * @deprecated Use external middleware for DNS rebinding protection instead.
     */
    enableDnsRebindingProtection?: boolean;
    /**
     * Retry interval in milliseconds to suggest to clients in SSE retry field.
     * When set, the server will send a retry field in SSE priming events to control
     * client reconnection timing for polling behavior.
     */
    retryInterval?: number;
}
/**
 * Options for handling a request
 */
export interface HandleRequestOptions {
    /**
     * Pre-parsed request body. If provided, the transport will use this instead of parsing req.json().
     * Useful when using body-parser middleware that has already parsed the body.
     */
    parsedBody?: unknown;
    /**
     * Authentication info from middleware. If provided, will be passed to message handlers.
     */
    authInfo?: AuthInfo;
}
/**
 * Server transport for Web Standards Streamable HTTP: this implements the MCP Streamable HTTP transport specification
 * using Web Standard APIs (Request, Response, ReadableStream).
 *
 * This transport works on any runtime that supports Web Standards: Node.js 18+, Cloudflare Workers, Deno, Bun, etc.
 *
 * Usage example:
 *
 * ```typescript
 * // Stateful mode - server sets the session ID
 * const statefulTransport = new WebStandardStreamableHTTPServerTransport({
 *   sessionIdGenerator: () => crypto.randomUUID(),
 * });
 *
 * // Stateless mode - explicitly set session ID to undefined
 * const statelessTransport = new WebStandardStreamableHTTPServerTransport({
 *   sessionIdGenerator: undefined,
 * });
 *
 * // Hono.js usage
 * app.all('/mcp', async (c) => {
 *   return transport.handleRequest(c.req.raw);
 * });
 *
 * // Cloudflare Workers usage
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     return transport.handleRequest(request);
 *   }
 * };
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
export declare class WebStandardStreamableHTTPServerTransport implements Transport {
    private sessionIdGenerator;
    private _started;
    private _hasHandledRequest;
    private _streamMapping;
    private _requestToStreamMapping;
    private _requestResponseMap;
    private _initialized;
    private _enableJsonResponse;
    private _standaloneSseStreamId;
    private _eventStore?;
    private _onsessioninitialized?;
    private _onsessionclosed?;
    private _allowedHosts?;
    private _allowedOrigins?;
    private _enableDnsRebindingProtection;
    private _retryInterval?;
    sessionId?: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    constructor(options?: WebStandardStreamableHTTPServerTransportOptions);
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    start(): Promise<void>;
    /**
     * Helper to create a JSON error response
     */
    private createJsonErrorResponse;
    /**
     * Validates request headers for DNS rebinding protection.
     * @returns Error response if validation fails, undefined if validation passes.
     */
    private validateRequestHeaders;
    /**
     * Handles an incoming HTTP request, whether GET, POST, or DELETE
     * Returns a Response object (Web Standard)
     */
    handleRequest(req: Request, options?: HandleRequestOptions): Promise<Response>;
    /**
     * Writes a priming event to establish resumption capability.
     * Only sends if eventStore is configured (opt-in for resumability) and
     * the client's protocol version supports empty SSE data (>= 2025-11-25).
     */
    private writePrimingEvent;
    /**
     * Handles GET requests for SSE stream
     */
    private handleGetRequest;
    /**
     * Replays events that would have been sent after the specified event ID
     * Only used when resumability is enabled
     */
    private replayEvents;
    /**
     * Writes an event to an SSE stream via controller with proper formatting
     */
    private writeSSEEvent;
    /**
     * Handles unsupported requests (PUT, PATCH, etc.)
     */
    private handleUnsupportedRequest;
    /**
     * Handles POST requests containing JSON-RPC messages
     */
    private handlePostRequest;
    /**
     * Handles DELETE requests to terminate sessions
     */
    private handleDeleteRequest;
    /**
     * Validates session ID for non-initialization requests.
     * Returns Response error if invalid, undefined otherwise
     */
    private validateSession;
    /**
     * Validates the MCP-Protocol-Version header on incoming requests.
     *
     * For initialization: Version negotiation handles unknown versions gracefully
     * (server responds with its supported version).
     *
     * For subsequent requests with MCP-Protocol-Version header:
     * - Accept if in supported list
     * - 400 if unsupported
     *
     * For HTTP requests without the MCP-Protocol-Version header:
     * - Accept and default to the version negotiated at initialization
     */
    private validateProtocolVersion;
    close(): Promise<void>;
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
    send(message: JSONRPCMessage, options?: {
        relatedRequestId?: RequestId;
    }): Promise<void>;
}
//# sourceMappingURL=webStandardStreamableHttp.d.ts.map