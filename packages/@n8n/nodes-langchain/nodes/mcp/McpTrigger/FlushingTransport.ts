import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';

export type CompressionResponse = Response & {
	/**
	 * `flush()` is defined in the compression middleware.
	 * This is necessary because the compression middleware sometimes waits
	 * for a certain amount of data before sending the data to the client
	 */
	flush: () => void;
};

export class FlushingSSEServerTransport extends SSEServerTransport {
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
	private response: CompressionResponse;

	constructor(options: StreamableHTTPServerTransportOptions, response: CompressionResponse) {
		super(options);
		this.response = response;
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
