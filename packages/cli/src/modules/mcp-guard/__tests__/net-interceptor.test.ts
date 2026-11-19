import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';

import axios from 'axios';

import { withChatScope, withNodeGuard } from '../chat-scope';
import type { HydrationModel } from '../hydration-llm';
import {
	installNetInterceptor,
	MIN_TIMEOUT_MS,
	sendToNetwork,
	type CapturedRequest,
} from '../net-interceptor';

const model: HydrationModel = { resolve: async () => ({}) as never };

// A guarded node tool of a test chat.
const inGuard = async <T>(fn: () => Promise<T>): Promise<T> =>
	await withChatScope('chat-1', async () => await withNodeGuard(model, fn), 'agent-1');

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

	it('passes a request through when it is not in a guarded node tool', async () => {
		const decide = vi.fn();
		uninstall = installNetInterceptor(decide);

		expect(await get(base)).toBe('real');
		expect(decide).not.toHaveBeenCalled();
		expect(hits).toBe(1);
	});

	it('passes a request through in a chat scope that is not a guarded node tool', async () => {
		const decide = vi.fn();
		uninstall = installNetInterceptor(decide);

		const text = await withChatScope('chat-1', async () => await get(base), 'agent-1');

		expect(text).toBe('real');
		expect(decide).not.toHaveBeenCalled();
	});

	it('passes a request through inside a guarded node tool when decide says passthrough', async () => {
		const decide = vi.fn(async () => 'passthrough' as const);
		uninstall = installNetInterceptor(decide);

		const text = await inGuard(async () => await get(base));

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

		const res = await inGuard(async () => await send(http, `${base}/a/b?x=1`, 'payload'));

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

		const res = await inGuard(
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

		const res = await inGuard(async () => await fetch(`${base}/f`, { method: 'PUT', body: 'b' }));

		expect(res.status).toBe(202);
		expect(await res.text()).toBe('fake-fetch');
		expect(decide.mock.calls[0][0].method).toBe('PUT');
		expect(decide.mock.calls[0][0].body?.toString()).toBe('b');
		expect(hits).toBe(0);
	});

	it('catches an axios request, as the request helpers of the nodes send it', async () => {
		const seen: CapturedRequest[] = [];
		uninstall = installNetInterceptor(async (req) => {
			seen.push(req);
			return Response.json({ messages: [] }, { status: 200 });
		});

		const res = await inGuard(
			async () =>
				await axios.post(
					'https://www.googleapis.com/gmail/v1/users/me/messages/send?a=1',
					{ raw: 'abc' },
					{ headers: { Authorization: 'Bearer real' } },
				),
		);

		expect(res.data).toEqual({ messages: [] });
		expect(seen).toHaveLength(1);
		expect(seen[0].method).toBe('POST');
		expect(seen[0].url.host).toBe('www.googleapis.com');
		expect(seen[0].url.pathname).toBe('/gmail/v1/users/me/messages/send');
		expect(seen[0].headers.authorization).toBe('Bearer real');
		expect(JSON.parse(seen[0].body?.toString() ?? '{}')).toEqual({ raw: 'abc' });
	});

	it('captures basic auth from the auth option and from the url', async () => {
		const seen: CapturedRequest[] = [];
		uninstall = installNetInterceptor(async (req) => {
			seen.push(req);
			return new Response('ok');
		});

		await inGuard(
			async () =>
				await new Promise<void>((resolve, reject) => {
					http
						.get(`${base}/a`, { auth: 'user:pass' }, (res) => {
							res.resume();
							res.on('end', resolve);
						})
						.on('error', reject);
				}),
		);

		expect(seen[0].headers.authorization).toBe(
			`Basic ${Buffer.from('user:pass').toString('base64')}`,
		);
	});

	it('does not send a header that the caller removed when the request passes through', async () => {
		let seen: http.IncomingHttpHeaders = {};
		server.removeAllListeners('request');
		server.on('request', (req, res) => {
			seen = req.headers;
			res.end('real');
		});
		uninstall = installNetInterceptor(async () => 'passthrough');

		await inGuard(
			async () =>
				await new Promise<void>((resolve, reject) => {
					const req = http.request(
						`${base}/r`,
						{ headers: { 'x-drop': '1', 'x-keep': '2' } },
						(res) => {
							res.resume();
							res.on('end', resolve);
						},
					);
					req.on('error', reject);
					req.removeHeader('x-drop');
					req.end();
				}),
		);

		expect(seen['x-drop']).toBeUndefined();
		expect(seen['x-keep']).toBe('2');
	});

	it('uses the init of fetch when the input is a Request', async () => {
		const decide = vi.fn(async (_req: CapturedRequest) => new Response('fake'));
		uninstall = installNetInterceptor(decide);

		await inGuard(async () => await fetch(new Request(`${base}/q`), { method: 'DELETE' }));

		expect(decide.mock.calls[0][0].method).toBe('DELETE');
	});

	it('ends the wait after the timeout of the node, but not before the minimum', async () => {
		vi.useFakeTimers();
		try {
			let release: (res: Response) => void = () => {};
			uninstall = installNetInterceptor(
				async () => await new Promise<Response>((resolve) => (release = resolve)),
			);
			const events: string[] = [];

			const req = await inGuard(async () => {
				const r = http.request(`${base}/slow`, (res) => {
					events.push('response');
					res.resume();
				});
				r.on('error', () => events.push('error'));
				r.setTimeout(1000, () => {
					events.push('timeout');
					r.destroy();
				});
				r.end();
				return r;
			});

			await vi.advanceTimersByTimeAsync(1000);
			expect(events).toEqual([]);
			await vi.advanceTimersByTimeAsync(MIN_TIMEOUT_MS);
			expect(events).toEqual(['timeout']);
			release(new Response('late'));
			await vi.advanceTimersByTimeAsync(10);
			expect(events).toEqual(['timeout']);
			expect(req.destroyed).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not intercept the calls that decide makes itself', async () => {
		let decisions = 0;
		uninstall = installNetInterceptor(async () => {
			decisions++;
			// The helper work of a decision (gym, real read, model) must reach the network.
			const inner = await get(base);
			const viaFetch = await (await fetch(base)).text();
			return new Response(`${inner}+${viaFetch}`);
		});

		const res = await inGuard(async () => await send(http, `${base}/x`, ''));

		expect(res.text).toBe('real+real');
		expect(decisions).toBe(1);
		expect(hits).toBe(2);
	});

	it('sendToNetwork sends a captured request to the real network without Host and length headers', async () => {
		let seen: http.IncomingHttpHeaders = {};
		let seenBody = '';
		server.removeAllListeners('request');
		server.on('request', (req, res) => {
			seen = req.headers;
			const chunks: Buffer[] = [];
			req.on('data', (c: Buffer) => chunks.push(c));
			req.on('end', () => {
				seenBody = Buffer.concat(chunks).toString();
				res.setHeader('content-type', 'application/json');
				res.end('{"ok":true}');
			});
		});
		uninstall = installNetInterceptor(vi.fn());

		const res = await inGuard(
			async () =>
				await sendToNetwork({
					method: 'POST',
					url: new URL(`${base}/p`),
					headers: {
						host: 'www.googleapis.com',
						'content-length': '999',
						authorization: 'Bearer t',
					},
					body: Buffer.from('abc'),
				}),
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(seenBody).toBe('abc');
		expect(seen.authorization).toBe('Bearer t');
		expect(seen.host).not.toBe('www.googleapis.com');
		expect(seen['content-length']).toBe('3');
	});

	it('sendToNetwork returns a redirect as it is and does not follow it', async () => {
		server.removeAllListeners('request');
		server.on('request', (req, res) => {
			if (req.url === '/target') {
				hits++;
				res.end('target');
				return;
			}
			res.statusCode = 302;
			res.setHeader('location', `${base}/target`);
			res.end();
		});
		uninstall = installNetInterceptor(vi.fn());

		const res = await inGuard(
			async () =>
				await sendToNetwork({ method: 'GET', url: new URL(`${base}/start`), headers: {} }),
		);

		expect(res.status).toBe(302);
		expect(hits).toBe(0);
	});

	it('strips content-encoding and content-length from an answer, because the body is plain', async () => {
		uninstall = installNetInterceptor(
			async () =>
				new Response('plain', {
					headers: { 'content-encoding': 'gzip', 'content-length': '999', 'x-keep': '1' },
				}),
		);

		const headers = await inGuard(
			async () =>
				await new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
					http.get(`${base}/h`, (res) => resolve(res.headers)).on('error', reject);
				}),
		);

		expect(headers['content-encoding']).toBeUndefined();
		expect(headers['content-length']).toBeUndefined();
		expect(headers['x-keep']).toBe('1');
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
		await inGuard(async () => await get(base));
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
