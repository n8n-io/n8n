import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { ServerResponse } from 'node:http';

export class FlushingSSEServerTransport extends SSEServerTransport {
	private _mySseResponse?: ServerResponse;

	constructor(_endpoint: string, res: ServerResponse) {
		super(_endpoint, res);
		this._mySseResponse = res;
	}

	async send(message: JSONRPCMessage): Promise<void> {
		await super.send(message);
		// @ts-expect-error 2339
		this._mySseResponse.flush();
	}
}
