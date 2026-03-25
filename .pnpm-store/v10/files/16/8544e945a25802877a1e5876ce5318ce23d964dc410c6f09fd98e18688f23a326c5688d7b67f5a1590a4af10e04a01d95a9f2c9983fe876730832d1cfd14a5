/**
 * Node.js HTTP Streamable HTTP Server Transport
 *
 * This is a thin wrapper around `WebStandardStreamableHTTPServerTransport` that provides
 * compatibility with Node.js HTTP server (IncomingMessage/ServerResponse).
 *
 * For web-standard environments (Cloudflare Workers, Deno, Bun), use `WebStandardStreamableHTTPServerTransport` directly.
 */
import { getRequestListener } from '@hono/node-server';
import { WebStandardStreamableHTTPServerTransport } from './webStandardStreamableHttp.js';
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
export class StreamableHTTPServerTransport {
    constructor(options = {}) {
        // Store auth and parsedBody per request for passing through to handleRequest
        this._requestContext = new WeakMap();
        this._webStandardTransport = new WebStandardStreamableHTTPServerTransport(options);
        // Create a request listener that wraps the web standard transport
        // getRequestListener converts Node.js HTTP to Web Standard and properly handles SSE streaming
        // overrideGlobalObjects: false prevents Hono from overwriting global Response, which would
        // break frameworks like Next.js whose response classes extend the native Response
        this._requestListener = getRequestListener(async (webRequest) => {
            // Get context if available (set during handleRequest)
            const context = this._requestContext.get(webRequest);
            return this._webStandardTransport.handleRequest(webRequest, {
                authInfo: context?.authInfo,
                parsedBody: context?.parsedBody
            });
        }, { overrideGlobalObjects: false });
    }
    /**
     * Gets the session ID for this transport instance.
     */
    get sessionId() {
        return this._webStandardTransport.sessionId;
    }
    /**
     * Sets callback for when the transport is closed.
     */
    set onclose(handler) {
        this._webStandardTransport.onclose = handler;
    }
    get onclose() {
        return this._webStandardTransport.onclose;
    }
    /**
     * Sets callback for transport errors.
     */
    set onerror(handler) {
        this._webStandardTransport.onerror = handler;
    }
    get onerror() {
        return this._webStandardTransport.onerror;
    }
    /**
     * Sets callback for incoming messages.
     */
    set onmessage(handler) {
        this._webStandardTransport.onmessage = handler;
    }
    get onmessage() {
        return this._webStandardTransport.onmessage;
    }
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    async start() {
        return this._webStandardTransport.start();
    }
    /**
     * Closes the transport and all active connections.
     */
    async close() {
        return this._webStandardTransport.close();
    }
    /**
     * Sends a JSON-RPC message through the transport.
     */
    async send(message, options) {
        return this._webStandardTransport.send(message, options);
    }
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
    async handleRequest(req, res, parsedBody) {
        // Store context for this request to pass through auth and parsedBody
        // We need to intercept the request creation to attach this context
        const authInfo = req.auth;
        // Create a custom handler that includes our context
        // overrideGlobalObjects: false prevents Hono from overwriting global Response, which would
        // break frameworks like Next.js whose response classes extend the native Response
        const handler = getRequestListener(async (webRequest) => {
            return this._webStandardTransport.handleRequest(webRequest, {
                authInfo,
                parsedBody
            });
        }, { overrideGlobalObjects: false });
        // Delegate to the request listener which handles all the Node.js <-> Web Standard conversion
        // including proper SSE streaming support
        await handler(req, res);
    }
    /**
     * Close an SSE stream for a specific request, triggering client reconnection.
     * Use this to implement polling behavior during long-running operations -
     * client will reconnect after the retry interval specified in the priming event.
     */
    closeSSEStream(requestId) {
        this._webStandardTransport.closeSSEStream(requestId);
    }
    /**
     * Close the standalone GET SSE stream, triggering client reconnection.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream() {
        this._webStandardTransport.closeStandaloneSSEStream();
    }
}
//# sourceMappingURL=streamableHttp.js.map