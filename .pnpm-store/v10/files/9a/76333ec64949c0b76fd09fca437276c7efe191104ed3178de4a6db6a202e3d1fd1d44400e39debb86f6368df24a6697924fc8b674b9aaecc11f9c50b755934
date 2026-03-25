import { type ErrorEvent, type EventSourceInit } from 'eventsource';
import { Transport, FetchLike } from '../shared/transport.js';
import { JSONRPCMessage } from '../types.js';
import { OAuthClientProvider } from './auth.js';
export declare class SseError extends Error {
    readonly code: number | undefined;
    readonly event: ErrorEvent;
    constructor(code: number | undefined, message: string | undefined, event: ErrorEvent);
}
/**
 * Configuration options for the `SSEClientTransport`.
 */
export type SSEClientTransportOptions = {
    /**
     * An OAuth client provider to use for authentication.
     *
     * When an `authProvider` is specified and the SSE connection is started:
     * 1. The connection is attempted with any existing access token from the `authProvider`.
     * 2. If the access token has expired, the `authProvider` is used to refresh the token.
     * 3. If token refresh fails or no access token exists, and auth is required, `OAuthClientProvider.redirectToAuthorization` is called, and an `UnauthorizedError` will be thrown from `connect`/`start`.
     *
     * After the user has finished authorizing via their user agent, and is redirected back to the MCP client application, call `SSEClientTransport.finishAuth` with the authorization code before retrying the connection.
     *
     * If an `authProvider` is not provided, and auth is required, an `UnauthorizedError` will be thrown.
     *
     * `UnauthorizedError` might also be thrown when sending any message over the SSE transport, indicating that the session has expired, and needs to be re-authed and reconnected.
     */
    authProvider?: OAuthClientProvider;
    /**
     * Customizes the initial SSE request to the server (the request that begins the stream).
     *
     * NOTE: Setting this property will prevent an `Authorization` header from
     * being automatically attached to the SSE request, if an `authProvider` is
     * also given. This can be worked around by setting the `Authorization` header
     * manually.
     */
    eventSourceInit?: EventSourceInit;
    /**
     * Customizes recurring POST requests to the server.
     */
    requestInit?: RequestInit;
    /**
     * Custom fetch implementation used for all network requests.
     */
    fetch?: FetchLike;
};
/**
 * Client transport for SSE: this will connect to a server using Server-Sent Events for receiving
 * messages and make separate POST requests for sending messages.
 * @deprecated SSEClientTransport is deprecated. Prefer to use StreamableHTTPClientTransport where possible instead. Note that because some servers are still using SSE, clients may need to support both transports during the migration period.
 */
export declare class SSEClientTransport implements Transport {
    private _eventSource?;
    private _endpoint?;
    private _abortController?;
    private _url;
    private _resourceMetadataUrl?;
    private _scope?;
    private _eventSourceInit?;
    private _requestInit?;
    private _authProvider?;
    private _fetch?;
    private _fetchWithInit;
    private _protocolVersion?;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    constructor(url: URL, opts?: SSEClientTransportOptions);
    private _authThenStart;
    private _commonHeaders;
    private _startOrAuth;
    start(): Promise<void>;
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    finishAuth(authorizationCode: string): Promise<void>;
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
    setProtocolVersion(version: string): void;
}
//# sourceMappingURL=sse.d.ts.map