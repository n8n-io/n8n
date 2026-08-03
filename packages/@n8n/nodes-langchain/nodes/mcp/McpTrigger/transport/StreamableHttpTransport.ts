import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'http';

import type { CompressionResponse, McpTransport, TransportType } from './Transport';

interface WebStandardTransportInternal {
	_initialized: boolean;
	sessionId: string;
}

interface StreamableHTTPTransportInternal {
	_webStandardTransport?: WebStandardTransportInternal;
}

function getWebStandardTransport(transport: unknown): WebStandardTransportInternal | undefined {
	if (typeof transport === 'object' && transport !== null && '_webStandardTransport' in transport) {
		const internal = (transport as StreamableHTTPTransportInternal)._webStandardTransport;
		if (typeof internal === 'object' && internal !== null) {
			return internal;
		}
	}
	return undefined;
}

export class StreamableHttpTransport extends StreamableHTTPServerTransport implements McpTransport {
	readonly transportType: TransportType = 'streamableHttp';

	private response: CompressionResponse;

	constructor(options: StreamableHTTPServerTransportOptions, response: CompressionResponse) {
		super(options);
		this.response = response;
	}

	markAsInitialized(sessionId: string): void {
		const webStandardTransport = getWebStandardTransport(this);
		if (!webStandardTransport) {
			throw new Error(
				'Failed to initialize StreamableHttpTransport: internal transport state not found. ' +
					'This may indicate an incompatible SDK version.',
			);
		}
		webStandardTransport._initialized = true;
		webStandardTransport.sessionId = sessionId;
	}

	async send(message: JSONRPCMessage): Promise<void> {
		await super.send(message);
		this.response.flush?.();
	}

	async handleRequest(
		req: IncomingMessage,
		resp: ServerResponse,
		parsedBody?: unknown,
	): Promise<void> {
		await super.handleRequest(req, resp, parsedBody);
		this.response.flush?.();
	}
}
