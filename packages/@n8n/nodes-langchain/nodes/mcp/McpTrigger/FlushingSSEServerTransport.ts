import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Response } from 'express';

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
}
