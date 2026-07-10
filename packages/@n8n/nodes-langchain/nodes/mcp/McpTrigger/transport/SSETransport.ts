import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'http';

import type { CompressionResponse, McpTransport, TransportType } from './Transport';

export class SSETransport extends SSEServerTransport implements McpTransport {
	readonly transportType: TransportType = 'sse';

	constructor(
		endpoint: string,
		private response: CompressionResponse,
	) {
		super(endpoint, response);
	}

	async send(message: JSONRPCMessage): Promise<void> {
		await super.send(message);
		this.response.flush?.();
	}

	async handleRequest(
		req: IncomingMessage,
		resp: ServerResponse,
		body: IncomingMessage,
	): Promise<void> {
		await super.handlePostMessage(req, resp, body);
		this.response.flush?.();
	}
}
