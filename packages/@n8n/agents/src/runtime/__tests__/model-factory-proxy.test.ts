import { generateText } from 'ai';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createModel } from '../model/model-factory';

// Uses the real undici (no mock) to check the env-proxy fallback of createModel.
describe('createModel env-proxy fallback', () => {
	let server: Server;
	let baseUrl: string;

	beforeAll(async () => {
		server = createServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					id: 'completion-1',
					object: 'chat.completion',
					created: 1,
					model: 'stub-model',
					choices: [
						{ index: 0, message: { role: 'assistant', content: 'pong' }, finish_reason: 'stop' },
					],
				}),
			);
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
	});

	afterAll(async () => {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	});

	beforeEach(() => {
		// Clear the host's proxy variables. undici reads the lowercase ones first.
		for (const name of ['http_proxy', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'])
			vi.stubEnv(name, undefined);
		// Nothing listens on port 1, so a proxied request fails.
		vi.stubEnv('HTTP_PROXY', 'http://127.0.0.1:1');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	const ping = async () =>
		await generateText({
			model: createModel({ id: 'custom/stub-model', url: baseUrl, apiKey: 'test-key' }),
			prompt: 'ping',
			maxRetries: 0,
		});

	it('connects directly to a NO_PROXY host', async () => {
		vi.stubEnv('NO_PROXY', '127.0.0.1');

		await expect(ping()).resolves.toMatchObject({ text: 'pong' });
	});

	it('sends other hosts through the proxy', async () => {
		await expect(ping()).rejects.toThrow('ECONNREFUSED 127.0.0.1:1');
	});

	it('forwards plain HTTP to the proxy without CONNECT', async () => {
		const requestLines: string[] = [];
		const proxy = createServer((req, res) => {
			requestLines.push(`${req.method} ${req.url}`);
			const upstream = request(
				req.url ?? '',
				{ method: req.method, headers: req.headers },
				(up) => {
					res.writeHead(up.statusCode ?? 502, up.headers);
					up.pipe(res);
				},
			);
			req.pipe(upstream);
		});
		// Like a proxy that allows CONNECT only to port 443.
		proxy.on('connect', (_req, socket) => socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'));
		await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
		vi.stubEnv('HTTP_PROXY', `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`);

		try {
			await expect(ping()).resolves.toMatchObject({ text: 'pong' });
			expect(requestLines).toEqual([`POST ${baseUrl}/chat/completions`]);
		} finally {
			proxy.closeAllConnections();
			await new Promise((resolve) => proxy.close(resolve));
		}
	});
});
