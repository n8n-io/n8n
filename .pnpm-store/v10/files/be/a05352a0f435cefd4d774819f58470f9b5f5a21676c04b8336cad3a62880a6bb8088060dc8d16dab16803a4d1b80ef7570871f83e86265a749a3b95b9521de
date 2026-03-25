import { createFetchWithInit, normalizeHeaders } from '../shared/transport.js';
import { isInitializedNotification, isJSONRPCRequest, isJSONRPCResultResponse, JSONRPCMessageSchema } from '../types.js';
import { auth, extractWWWAuthenticateParams, UnauthorizedError } from './auth.js';
import { EventSourceParserStream } from 'eventsource-parser/stream';
// Default reconnection options for StreamableHTTP connections
const DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
    initialReconnectionDelay: 1000,
    maxReconnectionDelay: 30000,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2
};
export class StreamableHTTPError extends Error {
    constructor(code, message) {
        super(`Streamable HTTP error: ${message}`);
        this.code = code;
    }
}
/**
 * Client transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It will connect to a server using HTTP POST for sending messages and HTTP GET with Server-Sent Events
 * for receiving messages.
 */
export class StreamableHTTPClientTransport {
    constructor(url, opts) {
        this._hasCompletedAuthFlow = false; // Circuit breaker: detect auth success followed by immediate 401
        this._url = url;
        this._resourceMetadataUrl = undefined;
        this._scope = undefined;
        this._requestInit = opts?.requestInit;
        this._authProvider = opts?.authProvider;
        this._fetch = opts?.fetch;
        this._fetchWithInit = createFetchWithInit(opts?.fetch, opts?.requestInit);
        this._sessionId = opts?.sessionId;
        this._reconnectionOptions = opts?.reconnectionOptions ?? DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
    }
    async _authThenStart() {
        if (!this._authProvider) {
            throw new UnauthorizedError('No auth provider');
        }
        let result;
        try {
            result = await auth(this._authProvider, {
                serverUrl: this._url,
                resourceMetadataUrl: this._resourceMetadataUrl,
                scope: this._scope,
                fetchFn: this._fetchWithInit
            });
        }
        catch (error) {
            this.onerror?.(error);
            throw error;
        }
        if (result !== 'AUTHORIZED') {
            throw new UnauthorizedError();
        }
        return await this._startOrAuthSse({ resumptionToken: undefined });
    }
    async _commonHeaders() {
        const headers = {};
        if (this._authProvider) {
            const tokens = await this._authProvider.tokens();
            if (tokens) {
                headers['Authorization'] = `Bearer ${tokens.access_token}`;
            }
        }
        if (this._sessionId) {
            headers['mcp-session-id'] = this._sessionId;
        }
        if (this._protocolVersion) {
            headers['mcp-protocol-version'] = this._protocolVersion;
        }
        const extraHeaders = normalizeHeaders(this._requestInit?.headers);
        return new Headers({
            ...headers,
            ...extraHeaders
        });
    }
    async _startOrAuthSse(options) {
        const { resumptionToken } = options;
        try {
            // Try to open an initial SSE stream with GET to listen for server messages
            // This is optional according to the spec - server may not support it
            const headers = await this._commonHeaders();
            headers.set('Accept', 'text/event-stream');
            // Include Last-Event-ID header for resumable streams if provided
            if (resumptionToken) {
                headers.set('last-event-id', resumptionToken);
            }
            const response = await (this._fetch ?? fetch)(this._url, {
                method: 'GET',
                headers,
                signal: this._abortController?.signal
            });
            if (!response.ok) {
                await response.body?.cancel();
                if (response.status === 401 && this._authProvider) {
                    // Need to authenticate
                    return await this._authThenStart();
                }
                // 405 indicates that the server does not offer an SSE stream at GET endpoint
                // This is an expected case that should not trigger an error
                if (response.status === 405) {
                    return;
                }
                throw new StreamableHTTPError(response.status, `Failed to open SSE stream: ${response.statusText}`);
            }
            this._handleSseStream(response.body, options, true);
        }
        catch (error) {
            this.onerror?.(error);
            throw error;
        }
    }
    /**
     * Calculates the next reconnection delay using  backoff algorithm
     *
     * @param attempt Current reconnection attempt count for the specific stream
     * @returns Time to wait in milliseconds before next reconnection attempt
     */
    _getNextReconnectionDelay(attempt) {
        // Use server-provided retry value if available
        if (this._serverRetryMs !== undefined) {
            return this._serverRetryMs;
        }
        // Fall back to exponential backoff
        const initialDelay = this._reconnectionOptions.initialReconnectionDelay;
        const growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
        const maxDelay = this._reconnectionOptions.maxReconnectionDelay;
        // Cap at maximum delay
        return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
    }
    /**
     * Schedule a reconnection attempt using server-provided retry interval or backoff
     *
     * @param lastEventId The ID of the last received event for resumability
     * @param attemptCount Current reconnection attempt count for this specific stream
     */
    _scheduleReconnection(options, attemptCount = 0) {
        // Use provided options or default options
        const maxRetries = this._reconnectionOptions.maxRetries;
        // Check if we've exceeded maximum retry attempts
        if (attemptCount >= maxRetries) {
            this.onerror?.(new Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
            return;
        }
        // Calculate next delay based on current attempt count
        const delay = this._getNextReconnectionDelay(attemptCount);
        // Schedule the reconnection
        this._reconnectionTimeout = setTimeout(() => {
            // Use the last event ID to resume where we left off
            this._startOrAuthSse(options).catch(error => {
                this.onerror?.(new Error(`Failed to reconnect SSE stream: ${error instanceof Error ? error.message : String(error)}`));
                // Schedule another attempt if this one failed, incrementing the attempt counter
                this._scheduleReconnection(options, attemptCount + 1);
            });
        }, delay);
    }
    _handleSseStream(stream, options, isReconnectable) {
        if (!stream) {
            return;
        }
        const { onresumptiontoken, replayMessageId } = options;
        let lastEventId;
        // Track whether we've received a priming event (event with ID)
        // Per spec, server SHOULD send a priming event with ID before closing
        let hasPrimingEvent = false;
        // Track whether we've received a response - if so, no need to reconnect
        // Reconnection is for when server disconnects BEFORE sending response
        let receivedResponse = false;
        const processStream = async () => {
            // this is the closest we can get to trying to catch network errors
            // if something happens reader will throw
            try {
                // Create a pipeline: binary stream -> text decoder -> SSE parser
                const reader = stream
                    .pipeThrough(new TextDecoderStream())
                    .pipeThrough(new EventSourceParserStream({
                    onRetry: (retryMs) => {
                        // Capture server-provided retry value for reconnection timing
                        this._serverRetryMs = retryMs;
                    }
                }))
                    .getReader();
                while (true) {
                    const { value: event, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    // Update last event ID if provided
                    if (event.id) {
                        lastEventId = event.id;
                        // Mark that we've received a priming event - stream is now resumable
                        hasPrimingEvent = true;
                        onresumptiontoken?.(event.id);
                    }
                    // Skip events with no data (priming events, keep-alives)
                    if (!event.data) {
                        continue;
                    }
                    if (!event.event || event.event === 'message') {
                        try {
                            const message = JSONRPCMessageSchema.parse(JSON.parse(event.data));
                            if (isJSONRPCResultResponse(message)) {
                                // Mark that we received a response - no need to reconnect for this request
                                receivedResponse = true;
                                if (replayMessageId !== undefined) {
                                    message.id = replayMessageId;
                                }
                            }
                            this.onmessage?.(message);
                        }
                        catch (error) {
                            this.onerror?.(error);
                        }
                    }
                }
                // Handle graceful server-side disconnect
                // Server may close connection after sending event ID and retry field
                // Reconnect if: already reconnectable (GET stream) OR received a priming event (POST stream with event ID)
                // BUT don't reconnect if we already received a response - the request is complete
                const canResume = isReconnectable || hasPrimingEvent;
                const needsReconnect = canResume && !receivedResponse;
                if (needsReconnect && this._abortController && !this._abortController.signal.aborted) {
                    this._scheduleReconnection({
                        resumptionToken: lastEventId,
                        onresumptiontoken,
                        replayMessageId
                    }, 0);
                }
            }
            catch (error) {
                // Handle stream errors - likely a network disconnect
                this.onerror?.(new Error(`SSE stream disconnected: ${error}`));
                // Attempt to reconnect if the stream disconnects unexpectedly and we aren't closing
                // Reconnect if: already reconnectable (GET stream) OR received a priming event (POST stream with event ID)
                // BUT don't reconnect if we already received a response - the request is complete
                const canResume = isReconnectable || hasPrimingEvent;
                const needsReconnect = canResume && !receivedResponse;
                if (needsReconnect && this._abortController && !this._abortController.signal.aborted) {
                    // Use the exponential backoff reconnection strategy
                    try {
                        this._scheduleReconnection({
                            resumptionToken: lastEventId,
                            onresumptiontoken,
                            replayMessageId
                        }, 0);
                    }
                    catch (error) {
                        this.onerror?.(new Error(`Failed to reconnect: ${error instanceof Error ? error.message : String(error)}`));
                    }
                }
            }
        };
        processStream();
    }
    async start() {
        if (this._abortController) {
            throw new Error('StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.');
        }
        this._abortController = new AbortController();
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
        if (!this._authProvider) {
            throw new UnauthorizedError('No auth provider');
        }
        const result = await auth(this._authProvider, {
            serverUrl: this._url,
            authorizationCode,
            resourceMetadataUrl: this._resourceMetadataUrl,
            scope: this._scope,
            fetchFn: this._fetchWithInit
        });
        if (result !== 'AUTHORIZED') {
            throw new UnauthorizedError('Failed to authorize');
        }
    }
    async close() {
        if (this._reconnectionTimeout) {
            clearTimeout(this._reconnectionTimeout);
            this._reconnectionTimeout = undefined;
        }
        this._abortController?.abort();
        this.onclose?.();
    }
    async send(message, options) {
        try {
            const { resumptionToken, onresumptiontoken } = options || {};
            if (resumptionToken) {
                // If we have at last event ID, we need to reconnect the SSE stream
                this._startOrAuthSse({ resumptionToken, replayMessageId: isJSONRPCRequest(message) ? message.id : undefined }).catch(err => this.onerror?.(err));
                return;
            }
            const headers = await this._commonHeaders();
            headers.set('content-type', 'application/json');
            headers.set('accept', 'application/json, text/event-stream');
            const init = {
                ...this._requestInit,
                method: 'POST',
                headers,
                body: JSON.stringify(message),
                signal: this._abortController?.signal
            };
            const response = await (this._fetch ?? fetch)(this._url, init);
            // Handle session ID received during initialization
            const sessionId = response.headers.get('mcp-session-id');
            if (sessionId) {
                this._sessionId = sessionId;
            }
            if (!response.ok) {
                const text = await response.text().catch(() => null);
                if (response.status === 401 && this._authProvider) {
                    // Prevent infinite recursion when server returns 401 after successful auth
                    if (this._hasCompletedAuthFlow) {
                        throw new StreamableHTTPError(401, 'Server returned 401 after successful authentication');
                    }
                    const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
                    this._resourceMetadataUrl = resourceMetadataUrl;
                    this._scope = scope;
                    const result = await auth(this._authProvider, {
                        serverUrl: this._url,
                        resourceMetadataUrl: this._resourceMetadataUrl,
                        scope: this._scope,
                        fetchFn: this._fetchWithInit
                    });
                    if (result !== 'AUTHORIZED') {
                        throw new UnauthorizedError();
                    }
                    // Mark that we completed auth flow
                    this._hasCompletedAuthFlow = true;
                    // Purposely _not_ awaited, so we don't call onerror twice
                    return this.send(message);
                }
                if (response.status === 403 && this._authProvider) {
                    const { resourceMetadataUrl, scope, error } = extractWWWAuthenticateParams(response);
                    if (error === 'insufficient_scope') {
                        const wwwAuthHeader = response.headers.get('WWW-Authenticate');
                        // Check if we've already tried upscoping with this header to prevent infinite loops.
                        if (this._lastUpscopingHeader === wwwAuthHeader) {
                            throw new StreamableHTTPError(403, 'Server returned 403 after trying upscoping');
                        }
                        if (scope) {
                            this._scope = scope;
                        }
                        if (resourceMetadataUrl) {
                            this._resourceMetadataUrl = resourceMetadataUrl;
                        }
                        // Mark that upscoping was tried.
                        this._lastUpscopingHeader = wwwAuthHeader ?? undefined;
                        const result = await auth(this._authProvider, {
                            serverUrl: this._url,
                            resourceMetadataUrl: this._resourceMetadataUrl,
                            scope: this._scope,
                            fetchFn: this._fetch
                        });
                        if (result !== 'AUTHORIZED') {
                            throw new UnauthorizedError();
                        }
                        return this.send(message);
                    }
                }
                throw new StreamableHTTPError(response.status, `Error POSTing to endpoint: ${text}`);
            }
            // Reset auth loop flag on successful response
            this._hasCompletedAuthFlow = false;
            this._lastUpscopingHeader = undefined;
            // If the response is 202 Accepted, there's no body to process
            if (response.status === 202) {
                await response.body?.cancel();
                // if the accepted notification is initialized, we start the SSE stream
                // if it's supported by the server
                if (isInitializedNotification(message)) {
                    // Start without a lastEventId since this is a fresh connection
                    this._startOrAuthSse({ resumptionToken: undefined }).catch(err => this.onerror?.(err));
                }
                return;
            }
            // Get original message(s) for detecting request IDs
            const messages = Array.isArray(message) ? message : [message];
            const hasRequests = messages.filter(msg => 'method' in msg && 'id' in msg && msg.id !== undefined).length > 0;
            // Check the response type
            const contentType = response.headers.get('content-type');
            if (hasRequests) {
                if (contentType?.includes('text/event-stream')) {
                    // Handle SSE stream responses for requests
                    // We use the same handler as standalone streams, which now supports
                    // reconnection with the last event ID
                    this._handleSseStream(response.body, { onresumptiontoken }, false);
                }
                else if (contentType?.includes('application/json')) {
                    // For non-streaming servers, we might get direct JSON responses
                    const data = await response.json();
                    const responseMessages = Array.isArray(data)
                        ? data.map(msg => JSONRPCMessageSchema.parse(msg))
                        : [JSONRPCMessageSchema.parse(data)];
                    for (const msg of responseMessages) {
                        this.onmessage?.(msg);
                    }
                }
                else {
                    await response.body?.cancel();
                    throw new StreamableHTTPError(-1, `Unexpected content type: ${contentType}`);
                }
            }
            else {
                // No requests in message but got 200 OK - still need to release connection
                await response.body?.cancel();
            }
        }
        catch (error) {
            this.onerror?.(error);
            throw error;
        }
    }
    get sessionId() {
        return this._sessionId;
    }
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
    async terminateSession() {
        if (!this._sessionId) {
            return; // No session to terminate
        }
        try {
            const headers = await this._commonHeaders();
            const init = {
                ...this._requestInit,
                method: 'DELETE',
                headers,
                signal: this._abortController?.signal
            };
            const response = await (this._fetch ?? fetch)(this._url, init);
            await response.body?.cancel();
            // We specifically handle 405 as a valid response according to the spec,
            // meaning the server does not support explicit session termination
            if (!response.ok && response.status !== 405) {
                throw new StreamableHTTPError(response.status, `Failed to terminate session: ${response.statusText}`);
            }
            this._sessionId = undefined;
        }
        catch (error) {
            this.onerror?.(error);
            throw error;
        }
    }
    setProtocolVersion(version) {
        this._protocolVersion = version;
    }
    get protocolVersion() {
        return this._protocolVersion;
    }
    /**
     * Resume an SSE stream from a previous event ID.
     * Opens a GET SSE connection with Last-Event-ID header to replay missed events.
     *
     * @param lastEventId The event ID to resume from
     * @param options Optional callback to receive new resumption tokens
     */
    async resumeStream(lastEventId, options) {
        await this._startOrAuthSse({
            resumptionToken: lastEventId,
            onresumptiontoken: options?.onresumptiontoken
        });
    }
}
//# sourceMappingURL=streamableHttp.js.map