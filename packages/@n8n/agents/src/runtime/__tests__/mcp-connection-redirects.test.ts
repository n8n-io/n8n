import { createRefreshingAuthFetch } from '@n8n/ai-utilities/refreshing-auth-fetch';
import http from 'node:http';

import {
	startSseServer,
	startStreamableHttpServer,
} from '../../__tests__/integration/mcp-server-helpers';
import { McpConnection } from '../mcp/mcp-connection';

// Regression guard: configured headers stay within the starting origin. Ref: #42559.
describe.each(['streamableHttp', 'sse'] as const)('McpConnection %s redirects', (transport) => {
	it.each([
		{ status: 307, fetchMode: 'default' },
		{ status: 308, fetchMode: 'default' },
		{ status: 307, fetchMode: 'guarded' },
		{ status: 308, fetchMode: 'guarded' },
		{ status: 307, fetchMode: 'plain' },
		{ status: 308, fetchMode: 'plain' },
	])('connects through $status with a $fetchMode fetch', async ({ status, fetchMode }) => {
		const server = transport === 'sse' ? await startSseServer() : await startStreamableHttpServer();
		const redirector = http.createServer((request, response) => {
			const path = request.url ?? '/';
			const location = path.startsWith('/forward/')
				? new URL(path.slice('/forward'.length), server.url).href
				: `/forward${path}`;
			response.writeHead(status, { location });
			response.end();
		});
		await new Promise<void>((resolve) => redirector.listen(0, '127.0.0.1', resolve));
		const { port } = redirector.address() as { port: number };
		const url = `http://127.0.0.1:${port}${new URL(server.url).pathname}`;
		const headers = { Authorization: 'Bearer test-token', 'X-Api-Key': 'test-api-key' };
		const originalFetch = globalThis.fetch;
		const wire = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			expect(init?.redirect).toBe('manual');
			return await originalFetch(input, init);
		});
		const assertAllowedUrl = vi.fn();
		const conn = new McpConnection({
			name: 'redirected',
			url,
			transport,
			connectionTimeoutMs: 5_000,
			...(fetchMode === 'guarded'
				? {
						fetch: createRefreshingAuthFetch({
							baseFetch: wire,
							initialHeaders: headers,
							assertAllowedUrl,
						}),
					}
				: { headers, ...(fetchMode === 'plain' ? { fetch: wire } : {}) }),
		});

		try {
			await conn.connect();
			const tools = await conn.listTools();
			expect(tools.map((tool) => tool.name)).toContain('redirected_echo');
			const targetCalls = wire.mock.calls.filter(
				([input]) =>
					new URL(input instanceof Request ? input.url : input).origin ===
					new URL(server.url).origin,
			);
			expect(targetCalls.length).toBeGreaterThan(0);
			for (const [, init] of targetCalls) {
				for (const name of Object.keys(headers)) {
					expect(new Headers(init?.headers).get(name)).toBeNull();
				}
			}
			const sourceCalls = wire.mock.calls.filter(
				([input]) =>
					new URL(input instanceof Request ? input.url : input).origin === new URL(url).origin,
			);
			expect(sourceCalls.length).toBeGreaterThan(0);
			expect(
				sourceCalls.some(([input]) =>
					new URL(input instanceof Request ? input.url : input).pathname.startsWith('/forward/'),
				),
			).toBe(true);
			for (const [, init] of sourceCalls) {
				for (const [name, value] of Object.entries(headers)) {
					expect(new Headers(init?.headers).get(name)).toBe(value);
				}
			}
			if (fetchMode === 'guarded') {
				expect(assertAllowedUrl).toHaveBeenCalledWith(url);
				expect(assertAllowedUrl).toHaveBeenCalledWith(server.url);
			}
		} finally {
			await conn.disconnect();
			wire.mockRestore();
			redirector.closeAllConnections();
			await new Promise<void>((resolve) => redirector.close(() => resolve()));
			await server.close();
		}
	});
});
