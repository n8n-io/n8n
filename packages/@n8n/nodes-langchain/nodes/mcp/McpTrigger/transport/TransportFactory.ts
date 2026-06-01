import { randomUUID } from 'crypto';

import { SSETransport } from './SSETransport';
import { StreamableHttpTransport } from './StreamableHttpTransport';
import type { CompressionResponse } from './Transport';

export interface StreamableHttpOptions {
	sessionIdGenerator?: () => string;
	onsessioninitialized?: (sessionId: string) => Promise<void>;
}

export class TransportFactory {
	createSSE(postUrl: string, response: CompressionResponse): SSETransport {
		return new SSETransport(postUrl, response);
	}

	createStreamableHttp(
		options: StreamableHttpOptions,
		response: CompressionResponse,
	): StreamableHttpTransport {
		return new StreamableHttpTransport(
			{
				sessionIdGenerator: options.sessionIdGenerator ?? (() => randomUUID()),
				onsessioninitialized: options.onsessioninitialized,
			},
			response,
		);
	}

	recreateStreamableHttp(
		sessionId: string,
		response: CompressionResponse,
	): StreamableHttpTransport {
		const transport = new StreamableHttpTransport(
			{ sessionIdGenerator: () => sessionId },
			response,
		);
		transport.markAsInitialized(sessionId);
		return transport;
	}
}
