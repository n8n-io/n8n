import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StreamableHTTPServerTransport as BaseStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';

export class StreamableHTTPServerTransport extends BaseStreamableHTTPServerTransport {
	constructor(options: StreamableHTTPServerTransportOptions) {
		if (!options.sessionIdGenerator) {
			options.sessionIdGenerator = () => randomUUID();
		}
		super(options);
	}
}
