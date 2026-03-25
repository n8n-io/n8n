import { IncomingMessage, ServerResponse } from 'node:http';
import { Transport } from '../shared/transport.js';
import { JSONRPCMessage, MessageExtraInfo } from '../types.js';
import { AuthInfo } from './auth/types.js';
/**
 * Configuration options for SSEServerTransport.
 */
export interface SSEServerTransportOptions {
    /**
     * List of allowed host header values for DNS rebinding protection.
     * If not specified, host validation is disabled.
     * @deprecated Use the `hostHeaderValidation` middleware from `@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js` instead,
     * or use `createMcpExpressApp` from `@modelcontextprotocol/sdk/server/express.js` which includes localhost protection by default.
     */
    allowedHosts?: string[];
    /**
     * List of allowed origin header values for DNS rebinding protection.
     * If not specified, origin validation is disabled.
     * @deprecated Use the `hostHeaderValidation` middleware from `@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js` instead,
     * or use `createMcpExpressApp` from `@modelcontextprotocol/sdk/server/express.js` which includes localhost protection by default.
     */
    allowedOrigins?: string[];
    /**
     * Enable DNS rebinding protection (requires allowedHosts and/or allowedOrigins to be configured).
     * Default is false for backwards compatibility.
     * @deprecated Use the `hostHeaderValidation` middleware from `@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js` instead,
     * or use `createMcpExpressApp` from `@modelcontextprotocol/sdk/server/express.js` which includes localhost protection by default.
     */
    enableDnsRebindingProtection?: boolean;
}
/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This transport is only available in Node.js environments.
 * @deprecated SSEServerTransport is deprecated. Use StreamableHTTPServerTransport instead.
 */
export declare class SSEServerTransport implements Transport {
    private _endpoint;
    private res;
    private _sseResponse?;
    private _sessionId;
    private _options;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    /**
     * Creates a new SSE server transport, which will direct the client to POST messages to the relative or absolute URL identified by `_endpoint`.
     */
    constructor(_endpoint: string, res: ServerResponse, options?: SSEServerTransportOptions);
    /**
     * Validates request headers for DNS rebinding protection.
     * @returns Error message if validation fails, undefined if validation passes.
     */
    private validateRequestHeaders;
    /**
     * Handles the initial SSE connection request.
     *
     * This should be called when a GET request is made to establish the SSE stream.
     */
    start(): Promise<void>;
    /**
     * Handles incoming POST messages.
     *
     * This should be called when a POST request is made to send a message to the server.
     */
    handlePostMessage(req: IncomingMessage & {
        auth?: AuthInfo;
    }, res: ServerResponse, parsedBody?: unknown): Promise<void>;
    /**
     * Handle a client message, regardless of how it arrived. This can be used to inform the server of messages that arrive via a means different than HTTP POST.
     */
    handleMessage(message: unknown, extra?: MessageExtraInfo): Promise<void>;
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Returns the session ID for this transport.
     *
     * This can be used to route incoming POST requests.
     */
    get sessionId(): string;
}
//# sourceMappingURL=sse.d.ts.map