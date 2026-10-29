import { createRefreshingAuthFetch } from '@n8n/ai-utilities';
import http from 'node:http';

import {
	startSseServer,
	startStreamableHttpServer,
} from '../../__tests__/integration/mcp-server-helpers';
import { McpConnection } from '../mcp/mcp-connection';

describe.each(['streamableHttp', 'sse'] as const)('McpConnection %s redirects', (transport) => {
	it.each([
		{ status: 307, customFetch: false },
		{ status: 308, customFetch: false },
		{ status: 307, customFetch: true },
		{ status: 308, customFetch: true },
	])('connects through $status with customFetch=$customFetch', async ({ status, customFetch }) => {
		const server = transport === 'sse' ? await startSseServer() : await startStreamableHttpServer();
		const redirector = http.createServer((request, response) => {
			response.writeHead(status, { location: new URL(request.url ?? '/', server.url).href });
			response.end();
		});
		await new Promise<void>((resolve) => redirector.listen(0, '127.0.0.1', resolve));
		const { port } = redirector.address() as { port: number };
		const url = `http://127.0.0.1:${port}${new URL(server.url).pathname}`;
		const headers = { Authorization: 'Bearer test-token' };
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
			...(customFetch
				? {
						fetch: createRefreshingAuthFetch({
							baseFetch: wire,
							initialHeaders: headers,
							assertAllowedUrl,
						}),
					}
				: { headers }),
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
				expect(new Headers(init?.headers).get('authorization')).toBeNull();
			}
			const sourceCalls = wire.mock.calls.filter(
				([input]) =>
					new URL(input instanceof Request ? input.url : input).origin === new URL(url).origin,
			);
			expect(sourceCalls.length).toBeGreaterThan(0);
			for (const [, init] of sourceCalls) {
				expect(new Headers(init?.headers).get('authorization')).toBe(headers.Authorization);
			}
			if (customFetch) {
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
