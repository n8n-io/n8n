import { generateText } from 'ai';
import { createServer, type Server } from 'node:http';
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
});
