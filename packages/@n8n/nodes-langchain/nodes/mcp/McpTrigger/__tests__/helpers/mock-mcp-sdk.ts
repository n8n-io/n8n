import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { McpTransport, TransportType } from '../../transport/Transport';

/**
 * Creates a mock MCP Server
 */
export function createMockServer(): jest.Mocked<Server> {
	return {
		connect: jest.fn().mockResolvedValue(undefined),
		close: jest.fn().mockResolvedValue(undefined),
		setRequestHandler: jest.fn(),
		onclose: undefined,
		onerror: undefined,
	} as unknown as jest.Mocked<Server>;
}

/**
 * Creates a mock McpTransport
 */
export function createMockTransport(
	sessionId: string,
	transportType: TransportType = 'sse',
): jest.Mocked<McpTransport> {
	return {
		transportType,
		sessionId,
		send: jest.fn().mockResolvedValue(undefined),
		handleRequest: jest.fn().mockResolvedValue(undefined),
		close: jest.fn().mockResolvedValue(undefined),
		onclose: undefined,
	} as unknown as jest.Mocked<McpTransport>;
}
