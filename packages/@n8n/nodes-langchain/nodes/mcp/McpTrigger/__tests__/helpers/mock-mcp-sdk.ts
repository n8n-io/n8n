import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { McpTransport, TransportType } from '../../transport/Transport';

/**
 * Creates a mock MCP Server
 */
export function createMockServer(): vi.Mocked<Server> {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		setRequestHandler: vi.fn(),
		onclose: undefined,
		onerror: undefined,
	} as unknown as vi.Mocked<Server>;
}

/**
 * Creates a mock McpTransport
 */
export function createMockTransport(
	sessionId: string,
	transportType: TransportType = 'sse',
): vi.Mocked<McpTransport> {
	return {
		transportType,
		sessionId,
		send: vi.fn().mockResolvedValue(undefined),
		handleRequest: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		onclose: undefined,
	} as unknown as vi.Mocked<McpTransport>;
}
