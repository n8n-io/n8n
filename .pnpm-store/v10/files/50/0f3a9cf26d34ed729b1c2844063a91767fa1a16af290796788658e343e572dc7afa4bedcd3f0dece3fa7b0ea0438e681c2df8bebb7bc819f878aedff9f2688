"use strict";
/**
 * Web Standards Streamable HTTP Server Transport
 *
 * This is the core transport implementation using Web Standard APIs (Request, Response, ReadableStream).
 * It can run on any runtime that supports Web Standards: Node.js 18+, Cloudflare Workers, Deno, Bun, etc.
 *
 * For Node.js Express/HTTP compatibility, use `StreamableHTTPServerTransport` which wraps this transport.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebStandardStreamableHTTPServerTransport = void 0;
const types_js_1 = require("../types.js");
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
class WebStandardStreamableHTTPServerTransport {
    constructor(options = {}) {
        this._started = false;
        this._hasHandledRequest = false;
        this._streamMapping = new Map();
        this._requestToStreamMapping = new Map();
        this._requestResponseMap = new Map();
        this._initialized = false;
        this._enableJsonResponse = false;
        this._standaloneSseStreamId = '_GET_stream';
        this.sessionIdGenerator = options.sessionIdGenerator;
        this._enableJsonResponse = options.enableJsonResponse ?? false;
        this._eventStore = options.eventStore;
        this._onsessioninitialized = options.onsessioninitialized;
        this._onsessionclosed = options.onsessionclosed;
        this._allowedHosts = options.allowedHosts;
        this._allowedOrigins = options.allowedOrigins;
        this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
        this._retryInterval = options.retryInterval;
    }
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    async start() {
        if (this._started) {
            throw new Error('Transport already started');
        }
        this._started = true;
    }
    /**
     * Helper to create a JSON error response
     */
    createJsonErrorResponse(status, code, message, options) {
        const error = { code, message };
        if (options?.data !== undefined) {
            error.data = options.data;
        }
        return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error,
            id: null
        }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
    }
    /**
     * Validates request headers for DNS rebinding protection.
     * @returns Error response if validation fails, undefined if validation passes.
     */
    validateRequestHeaders(req) {
        // Skip validation if protection is not enabled
        if (!this._enableDnsRebindingProtection) {
            return undefined;
        }
        // Validate Host header if allowedHosts is configured
        if (this._allowedHosts && this._allowedHosts.length > 0) {
            const hostHeader = req.headers.get('host');
            if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
                const error = `Invalid Host header: ${hostHeader}`;
                this.onerror?.(new Error(error));
                return this.createJsonErrorResponse(403, -32000, error);
            }
        }
        // Validate Origin header if allowedOrigins is configured
        if (this._allowedOrigins && this._allowedOrigins.length > 0) {
            const originHeader = req.headers.get('origin');
            if (originHeader && !this._allowedOrigins.includes(originHeader)) {
                const error = `Invalid Origin header: ${originHeader}`;
                this.onerror?.(new Error(error));
                return this.createJsonErrorResponse(403, -32000, error);
            }
        }
        return undefined;
    }
    /**
     * Handles an incoming HTTP request, whether GET, POST, or DELETE
     * Returns a Response object (Web Standard)
     */
    async handleRequest(req, options) {
        // In stateless mode (no sessionIdGenerator), each request must use a fresh transport.
        // Reusing a stateless transport causes message ID collisions between clients.
        if (!this.sessionIdGenerator && this._hasHandledRequest) {
            throw new Error('Stateless transport cannot be reused across requests. Create a new transport per request.');
        }
        this._hasHandledRequest = true;
        // Validate request headers for DNS rebinding protection
        const validationError = this.validateRequestHeaders(req);
        if (validationError) {
            return validationError;
        }
        switch (req.method) {
            case 'POST':
                return this.handlePostRequest(req, options);
            case 'GET':
                return this.handleGetRequest(req);
            case 'DELETE':
                return this.handleDeleteRequest(req);
            default:
                return this.handleUnsupportedRequest();
        }
    }
    /**
     * Writes a priming event to establish resumption capability.
     * Only sends if eventStore is configured (opt-in for resumability) and
     * the client's protocol version supports empty SSE data (>= 2025-11-25).
     */
    async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
        if (!this._eventStore) {
            return;
        }
        // Priming events have empty data which older clients cannot handle.
        // Only send priming events to clients with protocol version >= 2025-11-25
        // which includes the fix for handling empty SSE data.
        if (protocolVersion < '2025-11-25') {
            return;
        }
        const primingEventId = await this._eventStore.storeEvent(streamId, {});
        let primingEvent = `id: ${primingEventId}\ndata: \n\n`;
        if (this._retryInterval !== undefined) {
            primingEvent = `id: ${primingEventId}\nretry: ${this._retryInterval}\ndata: \n\n`;
        }
        controller.enqueue(encoder.encode(primingEvent));
    }
    /**
     * Handles GET requests for SSE stream
     */
    async handleGetRequest(req) {
        // The client MUST include an Accept header, listing text/event-stream as a supported content type.
        const acceptHeader = req.headers.get('accept');
        if (!acceptHeader?.includes('text/event-stream')) {
            return this.createJsonErrorResponse(406, -32000, 'Not Acceptable: Client must accept text/event-stream');
        }
        // If an Mcp-Session-Id is returned by the server during initialization,
        // clients using the Streamable HTTP transport MUST include it
        // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
        const sessionError = this.validateSession(req);
        if (sessionError) {
            return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
            return protocolError;
        }
        // Handle resumability: check for Last-Event-ID header
        if (this._eventStore) {
            const lastEventId = req.headers.get('last-event-id');
            if (lastEventId) {
                return this.replayEvents(lastEventId);
            }
        }
        // Check if there's already an active standalone SSE stream for this session
        if (this._streamMapping.get(this._standaloneSseStreamId) !== undefined) {
            // Only one GET SSE stream is allowed per session
            return this.createJsonErrorResponse(409, -32000, 'Conflict: Only one SSE stream is allowed per session');
        }
        const encoder = new TextEncoder();
        let streamController;
        // Create a ReadableStream with a controller we can use to push SSE events
        const readable = new ReadableStream({
            start: controller => {
                streamController = controller;
            },
            cancel: () => {
                // Stream was cancelled by client
                this._streamMapping.delete(this._standaloneSseStreamId);
            }
        });
        const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
        };
        // After initialization, always include the session ID if we have one
        if (this.sessionId !== undefined) {
            headers['mcp-session-id'] = this.sessionId;
        }
        // Store the stream mapping with the controller for pushing data
        this._streamMapping.set(this._standaloneSseStreamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
                this._streamMapping.delete(this._standaloneSseStreamId);
                try {
                    streamController.close();
                }
                catch {
                    // Controller might already be closed
                }
            }
        });
        return new Response(readable, { headers });
    }
    /**
     * Replays events that would have been sent after the specified event ID
     * Only used when resumability is enabled
     */
    async replayEvents(lastEventId) {
        if (!this._eventStore) {
            return this.createJsonErrorResponse(400, -32000, 'Event store not configured');
        }
        try {
            // If getStreamIdForEventId is available, use it for conflict checking
            let streamId;
            if (this._eventStore.getStreamIdForEventId) {
                streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
                if (!streamId) {
                    return this.createJsonErrorResponse(400, -32000, 'Invalid event ID format');
                }
                // Check conflict with the SAME streamId we'll use for mapping
                if (this._streamMapping.get(streamId) !== undefined) {
                    return this.createJsonErrorResponse(409, -32000, 'Conflict: Stream already has an active connection');
                }
            }
            const headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive'
            };
            if (this.sessionId !== undefined) {
                headers['mcp-session-id'] = this.sessionId;
            }
            // Create a ReadableStream with controller for SSE
            const encoder = new TextEncoder();
            let streamController;
            const readable = new ReadableStream({
                start: controller => {
                    streamController = controller;
                },
                cancel: () => {
                    // Stream was cancelled by client
                    // Cleanup will be handled by the mapping
                }
            });
            // Replay events - returns the streamId for backwards compatibility
            const replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
                send: async (eventId, message) => {
                    const success = this.writeSSEEvent(streamController, encoder, message, eventId);
                    if (!success) {
                        this.onerror?.(new Error('Failed replay events'));
                        try {
                            streamController.close();
                        }
                        catch {
                            // Controller might already be closed
                        }
                    }
                }
            });
            this._streamMapping.set(replayedStreamId, {
                controller: streamController,
                encoder,
                cleanup: () => {
                    this._streamMapping.delete(replayedStreamId);
                    try {
                        streamController.close();
                    }
                    catch {
                        // Controller might already be closed
                    }
                }
            });
            return new Response(readable, { headers });
        }
        catch (error) {
            this.onerror?.(error);
            return this.createJsonErrorResponse(500, -32000, 'Error replaying events');
        }
    }
    /**
     * Writes an event to an SSE stream via controller with proper formatting
     */
    writeSSEEvent(controller, encoder, message, eventId) {
        try {
            let eventData = `event: message\n`;
            // Include event ID if provided - this is important for resumability
            if (eventId) {
                eventData += `id: ${eventId}\n`;
            }
            eventData += `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Handles unsupported requests (PUT, PATCH, etc.)
     */
    handleUnsupportedRequest() {
        return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed.'
            },
            id: null
        }), {
            status: 405,
            headers: {
                Allow: 'GET, POST, DELETE',
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Handles POST requests containing JSON-RPC messages
     */
    async handlePostRequest(req, options) {
        try {
            // Validate the Accept header
            const acceptHeader = req.headers.get('accept');
            // The client MUST include an Accept header, listing both application/json and text/event-stream as supported content types.
            if (!acceptHeader?.includes('application/json') || !acceptHeader.includes('text/event-stream')) {
                return this.createJsonErrorResponse(406, -32000, 'Not Acceptable: Client must accept both application/json and text/event-stream');
            }
            const ct = req.headers.get('content-type');
            if (!ct || !ct.includes('application/json')) {
                return this.createJsonErrorResponse(415, -32000, 'Unsupported Media Type: Content-Type must be application/json');
            }
            // Build request info from headers
            const requestInfo = {
                headers: Object.fromEntries(req.headers.entries())
            };
            let rawMessage;
            if (options?.parsedBody !== undefined) {
                rawMessage = options.parsedBody;
            }
            else {
                try {
                    rawMessage = await req.json();
                }
                catch {
                    return this.createJsonErrorResponse(400, -32700, 'Parse error: Invalid JSON');
                }
            }
            let messages;
            // handle batch and single messages
            try {
                if (Array.isArray(rawMessage)) {
                    messages = rawMessage.map(msg => types_js_1.JSONRPCMessageSchema.parse(msg));
                }
                else {
                    messages = [types_js_1.JSONRPCMessageSchema.parse(rawMessage)];
                }
            }
            catch {
                return this.createJsonErrorResponse(400, -32700, 'Parse error: Invalid JSON-RPC message');
            }
            // Check if this is an initialization request
            // https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle/
            const isInitializationRequest = messages.some(types_js_1.isInitializeRequest);
            if (isInitializationRequest) {
                // If it's a server with session management and the session ID is already set we should reject the request
                // to avoid re-initialization.
                if (this._initialized && this.sessionId !== undefined) {
                    return this.createJsonErrorResponse(400, -32600, 'Invalid Request: Server already initialized');
                }
                if (messages.length > 1) {
                    return this.createJsonErrorResponse(400, -32600, 'Invalid Request: Only one initialization request is allowed');
                }
                this.sessionId = this.sessionIdGenerator?.();
                this._initialized = true;
                // If we have a session ID and an onsessioninitialized handler, call it immediately
                // This is needed in cases where the server needs to keep track of multiple sessions
                if (this.sessionId && this._onsessioninitialized) {
                    await Promise.resolve(this._onsessioninitialized(this.sessionId));
                }
            }
            if (!isInitializationRequest) {
                // If an Mcp-Session-Id is returned by the server during initialization,
                // clients using the Streamable HTTP transport MUST include it
                // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
                const sessionError = this.validateSession(req);
                if (sessionError) {
                    return sessionError;
                }
                // Mcp-Protocol-Version header is required for all requests after initialization.
                const protocolError = this.validateProtocolVersion(req);
                if (protocolError) {
                    return protocolError;
                }
            }
            // check if it contains requests
            const hasRequests = messages.some(types_js_1.isJSONRPCRequest);
            if (!hasRequests) {
                // if it only contains notifications or responses, return 202
                for (const message of messages) {
                    this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
                }
                return new Response(null, { status: 202 });
            }
            // The default behavior is to use SSE streaming
            // but in some cases server will return JSON responses
            const streamId = crypto.randomUUID();
            // Extract protocol version for priming event decision.
            // For initialize requests, get from request params.
            // For other requests, get from header (already validated).
            const initRequest = messages.find(m => (0, types_js_1.isInitializeRequest)(m));
            const clientProtocolVersion = initRequest
                ? initRequest.params.protocolVersion
                : (req.headers.get('mcp-protocol-version') ?? types_js_1.DEFAULT_NEGOTIATED_PROTOCOL_VERSION);
            if (this._enableJsonResponse) {
                // For JSON response mode, return a Promise that resolves when all responses are ready
                return new Promise(resolve => {
                    this._streamMapping.set(streamId, {
                        resolveJson: resolve,
                        cleanup: () => {
                            this._streamMapping.delete(streamId);
                        }
                    });
                    for (const message of messages) {
                        if ((0, types_js_1.isJSONRPCRequest)(message)) {
                            this._requestToStreamMapping.set(message.id, streamId);
                        }
                    }
                    for (const message of messages) {
                        this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
                    }
                });
            }
            // SSE streaming mode - use ReadableStream with controller for more reliable data pushing
            const encoder = new TextEncoder();
            let streamController;
            const readable = new ReadableStream({
                start: controller => {
                    streamController = controller;
                },
                cancel: () => {
                    // Stream was cancelled by client
                    this._streamMapping.delete(streamId);
                }
            });
            const headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            };
            // After initialization, always include the session ID if we have one
            if (this.sessionId !== undefined) {
                headers['mcp-session-id'] = this.sessionId;
            }
            // Store the response for this request to send messages back through this connection
            // We need to track by request ID to maintain the connection
            for (const message of messages) {
                if ((0, types_js_1.isJSONRPCRequest)(message)) {
                    this._streamMapping.set(streamId, {
                        controller: streamController,
                        encoder,
                        cleanup: () => {
                            this._streamMapping.delete(streamId);
                            try {
                                streamController.close();
                            }
                            catch {
                                // Controller might already be closed
                            }
                        }
                    });
                    this._requestToStreamMapping.set(message.id, streamId);
                }
            }
            // Write priming event if event store is configured (after mapping is set up)
            await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
            // handle each message
            for (const message of messages) {
                // Build closeSSEStream callback for requests when eventStore is configured
                // AND client supports resumability (protocol version >= 2025-11-25).
                // Old clients can't resume if the stream is closed early because they
                // didn't receive a priming event with an event ID.
                let closeSSEStream;
                let closeStandaloneSSEStream;
                if ((0, types_js_1.isJSONRPCRequest)(message) && this._eventStore && clientProtocolVersion >= '2025-11-25') {
                    closeSSEStream = () => {
                        this.closeSSEStream(message.id);
                    };
                    closeStandaloneSSEStream = () => {
                        this.closeStandaloneSSEStream();
                    };
                }
                this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo, closeSSEStream, closeStandaloneSSEStream });
            }
            // The server SHOULD NOT close the SSE stream before sending all JSON-RPC responses
            // This will be handled by the send() method when responses are ready
            return new Response(readable, { status: 200, headers });
        }
        catch (error) {
            // return JSON-RPC formatted error
            this.onerror?.(error);
            return this.createJsonErrorResponse(400, -32700, 'Parse error', { data: String(error) });
        }
    }
    /**
     * Handles DELETE requests to terminate sessions
     */
    async handleDeleteRequest(req) {
        const sessionError = this.validateSession(req);
        if (sessionError) {
            return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
            return protocolError;
        }
        await Promise.resolve(this._onsessionclosed?.(this.sessionId));
        await this.close();
        return new Response(null, { status: 200 });
    }
    /**
     * Validates session ID for non-initialization requests.
     * Returns Response error if invalid, undefined otherwise
     */
    validateSession(req) {
        if (this.sessionIdGenerator === undefined) {
            // If the sessionIdGenerator ID is not set, the session management is disabled
            // and we don't need to validate the session ID
            return undefined;
        }
        if (!this._initialized) {
            // If the server has not been initialized yet, reject all requests
            return this.createJsonErrorResponse(400, -32000, 'Bad Request: Server not initialized');
        }
        const sessionId = req.headers.get('mcp-session-id');
        if (!sessionId) {
            // Non-initialization requests without a session ID should return 400 Bad Request
            return this.createJsonErrorResponse(400, -32000, 'Bad Request: Mcp-Session-Id header is required');
        }
        if (sessionId !== this.sessionId) {
            // Reject requests with invalid session ID with 404 Not Found
            return this.createJsonErrorResponse(404, -32001, 'Session not found');
        }
        return undefined;
    }
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
    validateProtocolVersion(req) {
        const protocolVersion = req.headers.get('mcp-protocol-version');
        if (protocolVersion !== null && !types_js_1.SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
            return this.createJsonErrorResponse(400, -32000, `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${types_js_1.SUPPORTED_PROTOCOL_VERSIONS.join(', ')})`);
        }
        return undefined;
    }
    async close() {
        // Close all SSE connections
        this._streamMapping.forEach(({ cleanup }) => {
            cleanup();
        });
        this._streamMapping.clear();
        // Clear any pending responses
        this._requestResponseMap.clear();
        this.onclose?.();
    }
    /**
     * Close an SSE stream for a specific request, triggering client reconnection.
     * Use this to implement polling behavior during long-running operations -
     * client will reconnect after the retry interval specified in the priming event.
     */
    closeSSEStream(requestId) {
        const streamId = this._requestToStreamMapping.get(requestId);
        if (!streamId)
            return;
        const stream = this._streamMapping.get(streamId);
        if (stream) {
            stream.cleanup();
        }
    }
    /**
     * Close the standalone GET SSE stream, triggering client reconnection.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream() {
        const stream = this._streamMapping.get(this._standaloneSseStreamId);
        if (stream) {
            stream.cleanup();
        }
    }
    async send(message, options) {
        let requestId = options?.relatedRequestId;
        if ((0, types_js_1.isJSONRPCResultResponse)(message) || (0, types_js_1.isJSONRPCErrorResponse)(message)) {
            // If the message is a response, use the request ID from the message
            requestId = message.id;
        }
        // Check if this message should be sent on the standalone SSE stream (no request ID)
        // Ignore notifications from tools (which have relatedRequestId set)
        // Those will be sent via dedicated response SSE streams
        if (requestId === undefined) {
            // For standalone SSE streams, we can only send requests and notifications
            if ((0, types_js_1.isJSONRPCResultResponse)(message) || (0, types_js_1.isJSONRPCErrorResponse)(message)) {
                throw new Error('Cannot send a response on a standalone SSE stream unless resuming a previous client request');
            }
            // Generate and store event ID if event store is provided
            // Store even if stream is disconnected so events can be replayed on reconnect
            let eventId;
            if (this._eventStore) {
                // Stores the event and gets the generated event ID
                eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
            }
            const standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
            if (standaloneSse === undefined) {
                // Stream is disconnected - event is stored for replay, nothing more to do
                return;
            }
            // Send the message to the standalone SSE stream
            if (standaloneSse.controller && standaloneSse.encoder) {
                this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
            }
            return;
        }
        // Get the response for this request
        const streamId = this._requestToStreamMapping.get(requestId);
        if (!streamId) {
            throw new Error(`No connection established for request ID: ${String(requestId)}`);
        }
        const stream = this._streamMapping.get(streamId);
        if (!this._enableJsonResponse && stream?.controller && stream?.encoder) {
            // For SSE responses, generate event ID if event store is provided
            let eventId;
            if (this._eventStore) {
                eventId = await this._eventStore.storeEvent(streamId, message);
            }
            // Write the event to the response stream
            this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
        }
        if ((0, types_js_1.isJSONRPCResultResponse)(message) || (0, types_js_1.isJSONRPCErrorResponse)(message)) {
            this._requestResponseMap.set(requestId, message);
            const relatedIds = Array.from(this._requestToStreamMapping.entries())
                .filter(([_, sid]) => sid === streamId)
                .map(([id]) => id);
            // Check if we have responses for all requests using this connection
            const allResponsesReady = relatedIds.every(id => this._requestResponseMap.has(id));
            if (allResponsesReady) {
                if (!stream) {
                    throw new Error(`No connection established for request ID: ${String(requestId)}`);
                }
                if (this._enableJsonResponse && stream.resolveJson) {
                    // All responses ready, send as JSON
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    if (this.sessionId !== undefined) {
                        headers['mcp-session-id'] = this.sessionId;
                    }
                    const responses = relatedIds.map(id => this._requestResponseMap.get(id));
                    if (responses.length === 1) {
                        stream.resolveJson(new Response(JSON.stringify(responses[0]), { status: 200, headers }));
                    }
                    else {
                        stream.resolveJson(new Response(JSON.stringify(responses), { status: 200, headers }));
                    }
                }
                else {
                    // End the SSE stream
                    stream.cleanup();
                }
                // Clean up
                for (const id of relatedIds) {
                    this._requestResponseMap.delete(id);
                    this._requestToStreamMapping.delete(id);
                }
            }
        }
    }
}
exports.WebStandardStreamableHTTPServerTransport = WebStandardStreamableHTTPServerTransport;
//# sourceMappingURL=webStandardStreamableHttp.js.map