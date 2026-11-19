import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';

import { withChatScope } from '../chat-scope';
import { installNetInterceptor, type CapturedRequest } from '../net-interceptor';

describe('installNetInterceptor', () => {
	let server: http.Server;
	let hits: number;
	let base: string;
	let uninstall: (() => void) | undefined;

	beforeEach(async () => {
		hits = 0;
		server = http.createServer((_req, res) => {
			hits++;
			res.end('real');
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		uninstall?.();
		uninstall = undefined;
		await new Promise((resolve) => server.close(resolve));
	});

	const get = async (url: string): Promise<string> =>
		await new Promise((resolve, reject) => {
			http
				.get(url, (res) => {
					const chunks: Buffer[] = [];
					res.on('data', (c: Buffer) => chunks.push(c));
					res.on('end', () => resolve(Buffer.concat(chunks).toString()));
				})
				.on('error', reject);
		});

	const send = async (
		lib: typeof http | typeof https,
		url: string,
		body: string,
	): Promise<{ status: number | undefined; text: string }> =>
		await new Promise((resolve, reject) => {
			const req = lib.request(url, { method: 'POST', headers: { 'x-a': '1' } }, (res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c: Buffer) => chunks.push(c));
				res.on('end', () =>
					resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString() }),
				);
			});
			req.on('error', reject);
			req.end(body);
		});

	it('passes a request through when no chat scope is set', async () => {
		const decide = vi.fn();
		uninstall = installNetInterceptor(decide);

		expect(await get(base)).toBe('real');
		expect(decide).not.toHaveBeenCalled();
		expect(hits).toBe(1);
	});

	it('passes a request through inside a chat scope when decide says passthrough', async () => {
		const decide = vi.fn(async () => 'passthrough' as const);
		uninstall = installNetInterceptor(decide);

		const text = await withChatScope('chat-1', async () => await get(base));

		expect(text).toBe('real');
		expect(decide).toHaveBeenCalledTimes(1);
		expect(hits).toBe(1);
	});

	it('calls decide with method, url, headers and body for http.request', async () => {
		const seen: CapturedRequest[] = [];
		uninstall = installNetInterceptor(async (req) => {
			seen.push(req);
			return new Response('fake', { status: 201 });
		});

		const res = await withChatScope(
			'chat-1',
			async () => await send(http, `${base}/a/b?x=1`, 'payload'),
		);

		expect(res).toEqual({ status: 201, text: 'fake' });
		expect(seen).toHaveLength(1);
		expect(seen[0].method).toBe('POST');
		expect(seen[0].url.pathname).toBe('/a/b');
		expect(seen[0].url.search).toBe('?x=1');
		expect(seen[0].headers['x-a']).toBe('1');
		expect(seen[0].body?.toString()).toBe('payload');
		expect(hits).toBe(0);
	});

	it('calls decide for https.request without opening a socket', async () => {
		const decide = vi.fn(async (_req: CapturedRequest) => new Response('fake-https'));
		uninstall = installNetInterceptor(decide);

		const res = await withChatScope(
			'chat-1',
			async () => await send(https, 'https://www.googleapis.com/gmail/v1/users/me/messages', ''),
		);

		expect(res.text).toBe('fake-https');
		expect(decide).toHaveBeenCalledTimes(1);
		expect(decide.mock.calls[0][0].url.hostname).toBe('www.googleapis.com');
	});

	it('calls decide for global fetch', async () => {
		const decide = vi.fn(
			async (_req: CapturedRequest) => new Response('fake-fetch', { status: 202 }),
		);
		uninstall = installNetInterceptor(decide);

		const res = await withChatScope(
			'chat-1',
			async () => await fetch(`${base}/f`, { method: 'PUT', body: 'b' }),
		);

		expect(res.status).toBe(202);
		expect(await res.text()).toBe('fake-fetch');
		expect(decide.mock.calls[0][0].method).toBe('PUT');
		expect(decide.mock.calls[0][0].body?.toString()).toBe('b');
		expect(hits).toBe(0);
	});

	it('uninstall restores the original clients', async () => {
		const originalRequest = http.request;
		const originalFetch = globalThis.fetch;
		const decide = vi.fn(async () => new Response('fake'));
		const off = installNetInterceptor(decide);
		expect(http.request).not.toBe(originalRequest);

		off();

		expect(http.request).toBe(originalRequest);
		expect(globalThis.fetch).toBe(originalFetch);
		await withChatScope('chat-1', async () => await get(base));
		expect(decide).not.toHaveBeenCalled();
	});

	it('does not stack when installed twice', () => {
		const originalRequest = http.request;
		const first = installNetInterceptor(vi.fn());
		const second = installNetInterceptor(vi.fn());

		first();
		expect(http.request).toBe(originalRequest);
		second();
		expect(http.request).toBe(originalRequest);
	});
});
