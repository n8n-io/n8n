import { Transport, FetchLike } from '../shared/transport.js';
import { JSONRPCMessage } from '../types.js';
import { OAuthClientProvider } from './auth.js';
export declare class StreamableHTTPError extends Error {
    readonly code: number | undefined;
    constructor(code: number | undefined, message: string | undefined);
}
/**
 * Options for starting or authenticating an SSE connection
 */
export interface StartSSEOptions {
    /**
     * The resumption token used to continue long-running requests that were interrupted.
     *
     * This allows clients to reconnect and continue from where they left off.
     */
    resumptionToken?: string;
    /**
     * A callback that is invoked when the resumption token changes.
     *
     * This allows clients to persist the latest token for potential reconnection.
     */
    onresumptiontoken?: (token: string) => void;
    /**
     * Override Message ID to associate with the replay message
     * so that response can be associate with the new resumed request.
     */
    replayMessageId?: string | number;
}
/**
 * Configuration options for reconnection behavior of the StreamableHTTPClientTransport.
 */
export interface StreamableHTTPReconnectionOptions {
    /**
     * Maximum backoff time between reconnection attempts in milliseconds.
     * Default is 30000 (30 seconds).
     */
    maxReconnectionDelay: number;
    /**
     * Initial backoff time between reconnection attempts in milliseconds.
     * Default is 1000 (1 second).
     */
    initialReconnectionDelay: number;
    /**
     * The factor by which the reconnection delay increases after each attempt.
     * Default is 1.5.
     */
    reconnectionDelayGrowFactor: number;
    /**
     * Maximum number of reconnection attempts before giving up.
     * Default is 2.
     */
    maxRetries: number;
}
/**
 * Configuration options for the `StreamableHTTPClientTransport`.
 */
export type StreamableHTTPClientTransportOptions = {
    /**
     * An OAuth client provider to use for authentication.
     *
     * When an `authProvider` is specified and the connection is started:
     * 1. The connection is attempted with any existing access token from the `authProvider`.
     * 2. If the access token has expired, the `authProvider` is used to refresh the token.
     * 3. If token refresh fails or no access token exists, and auth is required, `OAuthClientProvider.redirectToAuthorization` is called, and an `UnauthorizedError` will be thrown from `connect`/`start`.
     *
     * After the user has finished authorizing via their user agent, and is redirected back to the MCP client application, call `StreamableHTTPClientTransport.finishAuth` with the authorization code before retrying the connection.
     *
     * If an `authProvider` is not provided, and auth is required, an `UnauthorizedError` will be thrown.
     *
     * `UnauthorizedError` might also be thrown when sending any message over the transport, indicating that the session has expired, and needs to be re-authed and reconnected.
     */
    authProvider?: OAuthClientProvider;
    /**
     * Customizes HTTP requests to the server.
     */
    requestInit?: RequestInit;
    /**
     * Custom fetch implementation used for all network requests.
     */
    fetch?: FetchLike;
    /**
     * Options to configure the reconnection behavior.
     */
    reconnectionOptions?: StreamableHTTPReconnectionOptions;
    /**
     * Session ID for the connection. This is used to identify the session on the server.
     * When not provided and connecting to a server that supports session IDs, the server will generate a new session ID.
     */
    sessionId?: string;
};
/**
 * Client transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It will connect to a server using HTTP POST for sending messages and HTTP GET with Server-Sent Events
 * for receiving messages.
 */
export declare class StreamableHTTPClientTransport implements Transport {
    private _abortController?;
    private _url;
    private _resourceMetadataUrl?;
    private _scope?;
    private _requestInit?;
    private _authProvider?;
    private _fetch?;
    private _fetchWithInit;
    private _sessionId?;
    private _reconnectionOptions;
    private _protocolVersion?;
    private _hasCompletedAuthFlow;
    private _lastUpscopingHeader?;
    private _serverRetryMs?;
    private _reconnectionTimeout?;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    constructor(url: URL, opts?: StreamableHTTPClientTransportOptions);
    private _authThenStart;
    private _commonHeaders;
    private _startOrAuthSse;
    /**
     * Calculates the next reconnection delay using  backoff algorithm
     *
     * @param attempt Current reconnection attempt count for the specific stream
     * @returns Time to wait in milliseconds before next reconnection attempt
     */
    private _getNextReconnectionDelay;
    /**
     * Schedule a reconnection attempt using server-provided retry interval or backoff
     *
     * @param lastEventId The ID of the last received event for resumability
     * @param attemptCount Current reconnection attempt count for this specific stream
     */
    private _scheduleReconnection;
    private _handleSseStream;
    start(): Promise<void>;
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    finishAuth(authorizationCode: string): Promise<void>;
    close(): Promise<void>;
    send(message: JSONRPCMessage | JSONRPCMessage[], options?: {
        resumptionToken?: string;
        onresumptiontoken?: (token: string) => void;
    }): Promise<void>;
    get sessionId(): string | undefined;
    /**
     * Terminates the current session by sending a DELETE request to the server.
     *
     * Clients that no longer need a particular session
     * (e.g., because the user is leaving the client application) SHOULD send an
     * HTTP DELETE to the MCP endpoint with the Mcp-Session-Id header to explicitly
     * terminate the session.
     *
     * The server MAY respond with HTTP 405 Method Not Allowed, indicating that
     * the server does not allow clients to terminate sessions.
     */
    terminateSession(): Promise<void>;
    setProtocolVersion(version: string): void;
    get protocolVersion(): string | undefined;
    /**
     * Resume an SSE stream from a previous event ID.
     * Opens a GET SSE connection with Last-Event-ID header to replay missed events.
     *
     * @param lastEventId The event ID to resume from
     * @param options Optional callback to receive new resumption tokens
     */
    resumeStream(lastEventId: string, options?: {
        onresumptiontoken?: (token: string) => void;
    }): Promise<void>;
}
//# sourceMappingURL=streamableHttp.d.ts.map