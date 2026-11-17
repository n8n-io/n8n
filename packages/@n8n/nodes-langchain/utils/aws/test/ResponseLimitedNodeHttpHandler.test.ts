import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Readable } from 'node:stream';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ResponseLimitedNodeHttpHandler } from '../ResponseLimitedNodeHttpHandler.js';

type HttpRequest = Parameters<ResponseLimitedNodeHttpHandler['handle']>[0];

// The response-size cap is read from the environment when the module loads, so
// each test reloads the handler with the value it needs.
async function loadHandler(maxResponseSize: string) {
	vi.resetModules();
	vi.stubEnv('N8N_AI_MAX_RESPONSE_SIZE', maxResponseSize);
	const { ResponseLimitedNodeHttpHandler } = await import('../ResponseLimitedNodeHttpHandler.js');
	return new ResponseLimitedNodeHttpHandler();
}

async function readBody(body: Readable): Promise<string> {
	let text = '';
	for await (const chunk of body) text += (chunk as Buffer).toString();
	return text;
}

describe('ResponseLimitedNodeHttpHandler', () => {
	const payload = 'x'.repeat(100);
	let server: Server;
	let request: HttpRequest;

	beforeAll(async () => {
		server = createServer((_req, res) => res.end(payload));
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		request = {
			protocol: 'http:',
			hostname: '127.0.0.1',
			port: (server.address() as AddressInfo).port,
			method: 'POST',
			path: '/model/invoke',
			query: {},
			headers: {},
		} as HttpRequest;
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it('returns the full response body within the cap', async () => {
		const handler = await loadHandler('1000');

		const { response } = await handler.handle(request);

		await expect(readBody(response.body as Readable)).resolves.toBe(payload);
	});

	it('errors the response body over the cap', async () => {
		const handler = await loadHandler('10');

		const { response } = await handler.handle(request);

		await expect(readBody(response.body as Readable)).rejects.toThrow(
			/exceeded the maximum allowed size/,
		);
	});
});
