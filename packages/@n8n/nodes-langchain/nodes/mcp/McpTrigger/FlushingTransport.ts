import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Internal interface for accessing the WebStandardStreamableHTTPServerTransport
 * that is wrapped by StreamableHTTPServerTransport. This is needed because the SDK
 * doesn't expose these properties publicly, but we need to access them for multi-main support.
 */
interface WebStandardTransportInternal {
	_initialized: boolean;
	sessionId: string;
}

interface StreamableHTTPTransportInternal {
	_webStandardTransport?: WebStandardTransportInternal;
}

/**
 * Type guard to check if an object has the internal _webStandardTransport property.
 * Uses a separate parameter to avoid TypeScript intersection issues with private properties.
 */
function getWebStandardTransport(transport: unknown): WebStandardTransportInternal | undefined {
	if (typeof transport === 'object' && transport !== null && '_webStandardTransport' in transport) {
		const internal = (transport as StreamableHTTPTransportInternal)._webStandardTransport;
		if (typeof internal === 'object' && internal !== null) {
			return internal;
		}
	}
	return undefined;
}

export type CompressionResponse = Response & {
	/**
	 * `flush()` is defined in the compression middleware.
	 * This is necessary because the compression middleware sometimes waits
	 * for a certain amount of data before sending the data to the client
	 */
	flush: () => void;
};

export class FlushingSSEServerTransport extends SSEServerTransport {
	/** Transport type identifier for runtime type checking without instanceof */
	readonly transportType = 'sse' as const;

	constructor(
		_endpoint: string,
		private response: CompressionResponse,
	) {
		super(_endpoint, response);
	}

	async send(message: JSONRPCMessage): Promise<void> {
		await super.send(message);
		this.response.flush();
	}

	async handleRequest(
		req: IncomingMessage,
		resp: ServerResponse,
		message: IncomingMessage,
	): Promise<void> {
		await super.handlePostMessage(req, resp, message);
		this.response.flush();
	}
}

export class FlushingStreamableHTTPTransport extends StreamableHTTPServerTransport {
	/** Transport type identifier for runtime type checking without instanceof */
	readonly transportType = 'streamableHttp' as const;

	private response: CompressionResponse;

	constructor(options: StreamableHTTPServerTransportOptions, response: CompressionResponse) {
		super(options);
		this.response = response;
	}

	/**
	 * Marks the transport as initialized without going through the full initialization flow.
	 * This is used for multi-main support when recreating a transport for an existing session
	 * on a different main instance. The original session was already initialized on another main,
	 * so we need to mark this recreated transport as initialized to accept subsequent requests.
	 *
	 * @param sessionId - The session ID from the original initialization on another main instance.
	 *                    This must be set to match the mcp-session-id header from incoming requests,
	 *                    otherwise the SDK will reject requests with 404 "Session not found".
	 */
	markAsInitialized(sessionId: string): void {
		// Access the internal WebStandardStreamableHTTPServerTransport and set both
		// _initialized = true and sessionId to the existing session's ID.
		// This is necessary because:
		// 1. The SDK rejects requests if _initialized is false
		// 2. The SDK validates mcp-session-id header against its internal sessionId property
		const webStandardTransport = getWebStandardTransport(this);
		if (webStandardTransport) {
			webStandardTransport._initialized = true;
			webStandardTransport.sessionId = sessionId;
		}
	}

	async send(message: JSONRPCMessage): Promise<void> {
		await super.send(message);
		this.response.flush();
	}

	async handleRequest(
		req: IncomingMessage,
		resp: ServerResponse,
		parsedBody?: unknown,
	): Promise<void> {
		await super.handleRequest(req, resp, parsedBody);
		this.response.flush();
	}
}
