import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SseError } from '@modelcontextprotocol/sdk/client/sse.js';
import {
	StreamableHTTPClientTransport,
	StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { mapToNodeOperationError } from '../utils';
import { createCallTool, getErrorDescriptionFromToolCall } from '../../McpClientTool/utils';

describe('MCP HTTP error diagnostics', () => {
	it.each([400, 401, 403, 404, 429, 500, 503])(
		'preserves HTTP %i from an empty transport response in connection and tool errors',
		async (status) => {
			const transport = new StreamableHTTPClientTransport(new URL('https://example.invalid/mcp'), {
				fetch: async () => new Response('', { status }),
			});
			let failure: unknown;
			try {
				await transport.start();
				await transport.send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
			} catch (error) {
				failure = error;
			} finally {
				await transport.close();
			}
			expect(failure).toBeInstanceOf(StreamableHTTPError);
			if (!(failure instanceof StreamableHTTPError)) throw new Error('Expected an HTTP error');
			expect(failure.code).toBe(status);
			expect(failure.message).not.toContain(String(status));

			const expected = `HTTP ${status}: ${failure.message}`;
			const client = mockDeep<Client>();
			client.callTool.mockRejectedValue(failure);
			const onError = vi.fn();
			expect(await createCallTool('lookup', client, 1000, onError)({})).toEqual({
				isError: true,
				content: [{ type: 'text', text: expected }],
			});
			expect(onError).toHaveBeenCalledWith(expected);
			expect(
				mapToNodeOperationError(mockDeep<INode>(), { type: 'connection', error: failure })
					.description,
			).toBe(expected);
			if (status === 401 || status === 403) {
				expect(
					mapToNodeOperationError(mockDeep<INode>(), { type: 'auth', error: failure }).description,
				).toBe(expected);
			}
		},
	);

	it('preserves the HTTP status of an SSE connection error', () => {
		const error = new SseError(503, 'Service unavailable', new Event('error'));
		expect(getErrorDescriptionFromToolCall(error)).toBe(`HTTP 503: ${error.message}`);
	});

	it.each([
		new StreamableHTTPError(-1, 'Unexpected content type'),
		new StreamableHTTPError(200, 'Unexpected response'),
		new SseError(undefined, 'Connection closed', new Event('error')),
		new McpError(-32603, 'Tool failed'),
		new McpError(-32001, 'Request timed out'),
		Object.assign(new Error('Application failure'), { code: 429 }),
	])('does not treat an application or protocol error as an HTTP status', (error) => {
		expect(getErrorDescriptionFromToolCall(error)).toBe(error.message);
	});
});
