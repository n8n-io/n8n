import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

import { proxyFetch } from '@utils/httpProxyAgent';

import { connectMcpClient } from '../utils';

jest.mock('@utils/httpProxyAgent', () => ({
	proxyFetch: jest.fn(),
}));

const endpoint = 'https://mcp.example.test/mcp';

describe.each(['httpStreamable', 'sse'] as const)('%s MCP redirects', (serverTransport) => {
	const mockedProxyFetch = jest.mocked(proxyFetch);
	let stream: ReadableStreamDefaultController<Uint8Array> | undefined;

	afterEach(() => {
		stream = undefined;
		mockedProxyFetch.mockReset();
	});

	it.each([307, 308])('connects through a %s cross-origin redirect', async (status) => {
		const target = 'https://redirected.example.test';
		mockedProxyFetch.mockImplementation(async (input, init) => {
			const url = new URL(input.toString());
			expect(init?.redirect).toBe('manual');

			if (url.origin === new URL(endpoint).origin) {
				return new Response(null, {
					status,
					headers: { location: new URL(url.pathname, target).href },
				});
			}

			expect(url.origin).toBe(target);
			if ((init?.method ?? 'GET') === 'GET') {
				if (serverTransport === 'httpStreamable') return new Response(null, { status: 405 });

				return new Response(
					new ReadableStream<Uint8Array>({
						start(controller) {
							stream = controller;
							controller.enqueue(new TextEncoder().encode('event: endpoint\ndata: /messages\n\n'));
						},
					}),
					{ headers: { 'content-type': 'text/event-stream' } },
				);
			}

			if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body');
			const message = JSONRPCMessageSchema.parse(JSON.parse(init.body));
			if (!('id' in message) || !('method' in message)) {
				return new Response(null, { status: 202 });
			}

			const response = {
				jsonrpc: '2.0',
				id: message.id,
				result:
					message.method === 'initialize'
						? {
								protocolVersion: '2025-03-26',
								capabilities: { tools: {} },
								serverInfo: { name: 'test-server', version: '1.0.0' },
							}
						: { tools: [] },
			};

			if (serverTransport === 'httpStreamable') return Response.json(response);

			stream?.enqueue(
				new TextEncoder().encode(`event: message\ndata: ${JSON.stringify(response)}\n\n`),
			);
			return new Response(null, { status: 202 });
		});

		const result = await connectMcpClient({
			serverTransport,
			endpointUrl: endpoint,
			allowedDomains: 'mcp.example.test,redirected.example.test',
			name: 'test-client',
			version: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw result.error.error;

		try {
			await expect(result.result.listTools()).resolves.toEqual({ tools: [] });
			expect(
				mockedProxyFetch.mock.calls.some(([input]) => new URL(input.toString()).origin === target),
			).toBe(true);
		} finally {
			await result.result.close();
		}
	});
});
