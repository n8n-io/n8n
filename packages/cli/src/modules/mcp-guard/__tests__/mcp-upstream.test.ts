import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hostFetch } from '../mcp-upstream';

describe('hostFetch', () => {
	let server: http.Server;
	let base: string;
	const seen: Array<{ host?: string; auth?: string; body: string }> = [];

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (c: Buffer) => (body += c.toString()));
			req.on('end', () => {
				seen.push({ host: req.headers.host, auth: req.headers.authorization, body });
				const status = Number(
					new URL(req.url ?? '/', 'http://x').searchParams.get('status') ?? 200,
				);
				res.writeHead(status, { 'content-type': 'application/json' });
				// A server may send bytes even where the status allows none. hostFetch must not choke.
				res.end(status === 200 ? '{"ok":true}' : '');
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it('sends the Host override, headers and body, and returns the response', async () => {
		const res = await hostFetch(`${base}/mcp`, {
			method: 'POST',
			headers: { Host: 'linear.gym.test', Authorization: 'Bearer b1' },
			body: '{"x":1}',
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(seen.at(-1)).toEqual({ host: 'linear.gym.test', auth: 'Bearer b1', body: '{"x":1}' });
	});

	it.each([202, 204, 205, 304])('settles with an empty body for a %i response', async (status) => {
		const res = await hostFetch(`${base}/mcp?status=${status}`, { method: 'POST' });
		expect(res.status).toBe(status);
		expect(res.body).toBeNull();
	});
});
