import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { sendToNetwork } from '../network';

describe('sendToNetwork', () => {
	let server: http.Server;
	let base: string;
	let seen: { headers: http.IncomingHttpHeaders; body: string; url?: string };
	let hits: number;

	beforeEach(async () => {
		hits = 0;
		seen = { headers: {}, body: '' };
		server = http.createServer((req, res) => {
			hits++;
			if (req.url === '/start') {
				res.statusCode = 302;
				res.setHeader('location', '/target');
				res.end();
				return;
			}
			const chunks: Buffer[] = [];
			req.on('data', (c: Buffer) => chunks.push(c));
			req.on('end', () => {
				seen = { headers: req.headers, body: Buffer.concat(chunks).toString(), url: req.url };
				res.setHeader('content-type', 'application/json');
				res.end('{"ok":true}');
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it('sends the method, body and headers, without the headers that the client sets itself', async () => {
		const res = await sendToNetwork({
			method: 'POST',
			url: new URL(`${base}/p?a=1`),
			headers: { host: 'www.googleapis.com', 'content-length': '999', authorization: 'Bearer t' },
			body: Buffer.from('abc'),
		});

		expect(await res.json()).toEqual({ ok: true });
		expect(seen.body).toBe('abc');
		expect(seen.url).toBe('/p?a=1');
		expect(seen.headers.authorization).toBe('Bearer t');
		expect(seen.headers.host).not.toBe('www.googleapis.com');
		expect(seen.headers['content-length']).toBe('3');
	});

	it('does not send a body with a GET', async () => {
		await sendToNetwork({
			method: 'GET',
			url: new URL(`${base}/g`),
			headers: {},
			body: Buffer.from('ignored'),
		});

		expect(seen.body).toBe('');
	});

	it('returns a redirect as it is and does not follow it', async () => {
		const res = await sendToNetwork({ method: 'GET', url: new URL(`${base}/start`), headers: {} });

		expect(res.status).toBe(302);
		expect(hits).toBe(1);
	});

	it('uses the given fetch and fails a request that takes too long', async () => {
		const custom = vi.fn(
			async (_url: unknown, init?: RequestInit) =>
				await new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);
		await expect(
			sendToNetwork(
				{ method: 'GET', url: new URL(`${base}/p`), headers: {} },
				{ fetch: custom, timeoutMs: 20 },
			),
		).rejects.toThrow('aborted');
		expect(custom).toHaveBeenCalledTimes(1);
		expect(hits).toBe(0);
	});
});
