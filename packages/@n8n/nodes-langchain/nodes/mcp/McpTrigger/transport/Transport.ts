import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';

export type CompressionResponse = Response & {
	flush?: () => void;
};

export type TransportType = 'sse' | 'streamableHttp';

export interface McpTransport {
	readonly transportType: TransportType;
	readonly sessionId: string | undefined;

	send(message: JSONRPCMessage): Promise<void>;
	handleRequest(req: IncomingMessage, resp: ServerResponse, body?: unknown): Promise<void>;
	close?(): Promise<void>;

	onclose?: () => void | Promise<void>;
}
