import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';
import { proxyFetch } from '@n8n/ai-utilities';
import { createResultError, createResultOk } from '@n8n/utils/result';
import type { NodeEgressFilter } from 'n8n-workflow';

import { connectMcpClient } from '../utils';

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	proxyFetch: vi.fn(),
}));

const endpoint = 'https://mcp.example.test/mcp';
const auth = 'Bearer test-token';
const createEgressFilter = (): NodeEgressFilter => ({
	validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
	validateConnectionHost: vi.fn().mockReturnValue(createResultOk(undefined)),
	createSecureLookup: vi.fn(),
	validateRedirectSync: vi.fn(),
});

describe.each(['httpStreamable', 'sse'] as const)('%s MCP redirects', (serverTransport) => {
	let stream: ReadableStreamDefaultController<Uint8Array> | undefined;

	afterEach(() => {
		stream = undefined;
		vi.mocked(proxyFetch).mockReset();
	});

	it.each([
		{ status: 307, target: 'https://other.example.test' },
		{ status: 308, target: 'https://mcp.example.test:8443' },
	])('connects through a $status redirect to $target', async ({ status, target }) => {
		const egressFilter = createEgressFilter();
		vi.mocked(proxyFetch).mockImplementation(async ({ input, init }) => {
			const url = new URL(input instanceof Request ? input.url : input);
			expect(egressFilter.validateUrl).toHaveBeenCalledWith(url.href);
			expect(init?.redirect).toBe('manual');
			if (url.origin === new URL(endpoint).origin) {
				expect(new Headers(init?.headers).get('authorization')).toBe(auth);
				return new Response(null, {
					status,
					headers: { location: new URL(url.pathname, target).href },
				});
			}
			expect(url.origin).toBe(target);
			expect(new Headers(init?.headers).get('authorization')).toBeNull();

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
			headers: { Authorization: auth },
			allowedDomains: 'mcp.example.test,other.example.test',
			secureEgressFilter: egressFilter,
			name: 'test-client',
			version: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw result.error.error;
		try {
			await expect(result.result.listTools()).resolves.toEqual({ tools: [] });
			expect(egressFilter.validateUrl).toHaveBeenCalledWith(`${target}/mcp`);
		} finally {
			await result.result.close();
		}
	});

	it.each(['credential domains', 'instance egress'])('rejects outside %s', async (policy) => {
		const target = 'https://other.example.test/mcp';
		const egressFilter = createEgressFilter();
		if (policy === 'instance egress') {
			vi.mocked(egressFilter.validateUrl).mockImplementation(async (url) =>
				url === target ? createResultError(new Error('Egress blocked')) : createResultOk(undefined),
			);
		}
		vi.mocked(proxyFetch).mockImplementation(async ({ input }) => {
			expect(input instanceof Request ? input.url : input.toString()).toBe(endpoint);
			return new Response(null, { status: 307, headers: { location: target } });
		});

		const result = await connectMcpClient({
			serverTransport,
			endpointUrl: endpoint,
			headers: { Authorization: auth },
			allowedDomains: policy === 'credential domains' ? 'mcp.example.test' : undefined,
			secureEgressFilter: egressFilter,
			name: 'test-client',
			version: 1,
		});

		expect(result).toMatchObject({
			ok: false,
			error: {
				type: 'connection',
				error: {
					message: expect.stringContaining(
						policy === 'credential domains' ? 'Domain not allowed' : 'Egress blocked',
					),
				},
			},
		});
		expect(proxyFetch).toHaveBeenCalledTimes(1);
		if (policy === 'instance egress') {
			expect(egressFilter.validateUrl).toHaveBeenCalledWith(target);
		}
	});
});
