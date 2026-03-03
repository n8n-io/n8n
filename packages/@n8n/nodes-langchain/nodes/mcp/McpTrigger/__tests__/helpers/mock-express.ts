import type { Request } from 'express';

import type { CompressionResponse } from '../../transport/Transport';

/** MCP session ID header name */
export const MCP_SESSION_ID_HEADER = 'mcp-session-id';

/**
 * Creates a mock Express Response with compression support
 */
export function createMockResponse(): jest.Mocked<CompressionResponse> {
	const response = {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		end: jest.fn().mockReturnThis(),
		write: jest.fn().mockReturnThis(),
		writeHead: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
		getHeader: jest.fn(),
		flush: jest.fn(),
		on: jest.fn().mockReturnThis(),
		once: jest.fn().mockReturnThis(),
		removeListener: jest.fn().mockReturnThis(),
		emit: jest.fn().mockReturnValue(true),
		headersSent: false,
	} as unknown as jest.Mocked<CompressionResponse>;

	return response;
}

/**
 * Creates a mock Express Request with specified properties
 */
export function createMockRequest(
	options: {
		sessionId?: string;
		body?: unknown;
		rawBody?: string;
		headers?: Record<string, string>;
		query?: Record<string, string>;
		method?: string;
		path?: string;
	} = {},
): jest.Mocked<Request> & { rawBody: Buffer } {
	const {
		sessionId,
		body = {},
		rawBody = '{}',
		headers = {},
		query = {},
		method = 'POST',
		path = '/mcp',
	} = options;

	const finalQuery: Record<string, string> = { ...query };
	const finalHeaders: Record<string, string> = { ...headers };

	if (sessionId) {
		if (!query.sessionId && !headers[MCP_SESSION_ID_HEADER]) {
			finalQuery.sessionId = sessionId;
		}
	}

	return {
		body,
		rawBody: Buffer.from(rawBody),
		headers: finalHeaders,
		query: finalQuery,
		method,
		params: {},
		url: path,
		path,
		get: jest.fn((name: string) => finalHeaders[name.toLowerCase()]),
	} as unknown as jest.Mocked<Request> & { rawBody: Buffer };
}

/**
 * Creates a mock request with a specific session ID in query params
 */
export function createMockRequestWithSessionId(
	sessionId: string,
	rawBody: string,
): jest.Mocked<Request> & { rawBody: Buffer } {
	return createMockRequest({
		sessionId,
		rawBody,
		query: { sessionId },
	});
}

/**
 * Creates a valid JSONRPC tool call message body
 */
export function createValidToolCallMessage(
	toolName: string,
	args: Record<string, unknown>,
	id: string | number = 1,
): string {
	return JSON.stringify({
		jsonrpc: '2.0',
		id,
		method: 'tools/call',
		params: {
			name: toolName,
			arguments: args,
		},
	});
}

/**
 * Creates a valid JSONRPC list tools request message body
 */
export function createListToolsMessage(id: string | number = 1): string {
	return JSON.stringify({
		jsonrpc: '2.0',
		id,
		method: 'tools/list',
	});
}

/**
 * Creates a mock request with session ID in the mcp-session-id header
 */
export function createMockRequestWithHeaderSessionId(
	sessionId: string,
	rawBody: string = '{}',
): jest.Mocked<Request> & { rawBody: Buffer } {
	return createMockRequest({
		rawBody,
		headers: { [MCP_SESSION_ID_HEADER]: sessionId },
		query: {},
	});
}
