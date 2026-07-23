import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import { SSEServerTransport } from "@modelcontextprotocol/server-legacy/sse";
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
