import http from 'node:http';
import type { AddressInfo } from 'node:net';

import {
	createGymSender,
	createHttpToolCaller,
	fromToolArgs,
	isReadToolName,
	toToolCall,
} from '../http-tool-caller';
import type { CapturedRequest } from '../network';

const req = (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) =>
	({
		method,
		url: new URL(url),
		headers,
		body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
	}) satisfies CapturedRequest;

describe('toToolCall', () => {
	it.each([
		['GET', 'https://www.googleapis.com/gmail/v1/users/me/messages', true, 'read_list_messages'],
		[
			'GET',
			'https://www.googleapis.com/gmail/v1/users/me/messages/1a1f32cf20c4c2fb',
			true,
			'read_get_messages',
		],
		['GET', 'https://www.googleapis.com/gmail/v1/users/me/labels', true, 'read_list_labels'],
		[
			'POST',
			'https://www.googleapis.com/gmail/v1/users/me/messages/send',
			false,
			'write_post_messages_send',
		],
		[
			'POST',
			'https://www.googleapis.com/gmail/v1/users/me/messages/1a1f32cf20c4c2fb/modify',
			false,
			'write_post_messages_modify',
		],
		['POST', 'https://www.googleapis.com/gmail/v1/users/me/drafts', false, 'write_post_drafts'],
		[
			'DELETE',
			'https://www.googleapis.com/gmail/v1/users/me/messages/1a1f32cf20c4c2fb',
			false,
			'write_delete_messages',
		],
	])('names %s %s', (method, url, readShaped, name) => {
		expect(toToolCall(req(method, url), readShaped).name).toBe(name);
	});

	it('keeps the path, the query (repeated keys as lists) and a JSON body in the args', () => {
		const call = toToolCall(
			req('POST', 'https://x.test/gmail/v1/users/me/messages?a=1&l=x&l=y', { raw: 'abc' }),
			false,
		);

		expect(call.args).toEqual({
			method: 'POST',
			path: '/gmail/v1/users/me/messages',
			query: { a: '1', l: ['x', 'y'] },
			body: { raw: 'abc' },
		});
	});

	it('keeps a body that is not JSON as text', () => {
		const call = toToolCall(
			{ ...req('POST', 'https://x.test/p'), body: Buffer.from('plain text') },
			false,
		);

		expect(call.args.body).toBe('plain text');
	});
});

describe('isReadToolName', () => {
	it('accepts only names that start with read_', () => {
		expect(isReadToolName.has('read_list_messages')).toBe(true);
		expect(isReadToolName.has('write_post_messages_send')).toBe(false);
		expect(isReadToolName.has('list_messages')).toBe(false);
	});
});

describe('fromToolArgs', () => {
	it('builds the request again from the args', () => {
		const call = toToolCall(
			req('POST', 'https://x.test/p/q?a=1&l=x&l=y', { k: [1] }, { 'x-h': '1' }),
			false,
		);

		const rebuilt = fromToolArgs('https://x.test', call.args, { authorization: 'Bearer t' });

		expect(rebuilt.method).toBe('POST');
		expect(rebuilt.url.toString()).toBe('https://x.test/p/q?a=1&l=x&l=y');
		expect(rebuilt.headers.authorization).toBe('Bearer t');
		expect(rebuilt.headers['content-type']).toBe('application/json');
		expect(JSON.parse(rebuilt.body?.toString() ?? '')).toEqual({ k: [1] });
	});

	it('sends no body for a GET', () => {
		const rebuilt = fromToolArgs('https://x.test', { method: 'GET', path: '/a', query: {} }, {});

		expect(rebuilt.body).toBeUndefined();
	});
});

describe('fromToolArgs path check', () => {
	it.each(['https://evil.test/x', '//evil.test/x', 'gmail/v1/x', '/a\\b'])(
		'refuses the path %s',
		(path) => {
			expect(() => fromToolArgs('https://x.test', { method: 'GET', path }, {})).toThrow();
		},
	);
});

describe('createHttpToolCaller', () => {
	it('does not send a call that the allow check refuses', async () => {
		const send = vi.fn(async (_r: CapturedRequest) => new Response('{}'));
		const caller = createHttpToolCaller({
			origin: 'https://x.test',
			send,
			headers: () => ({}),
			allow: (req) => req.method === 'GET',
		});

		await expect(caller.callTool('read_x', { method: 'POST', path: '/a' })).rejects.toThrow();
		expect(send).not.toHaveBeenCalled();
		await caller.callTool('read_x', { method: 'GET', path: '/a' });
		expect(send).toHaveBeenCalledTimes(1);
	});

	const respond = (status: number, body: string, type = 'application/json') =>
		vi.fn(
			async (_r: CapturedRequest) =>
				new Response(body, { status, headers: { 'content-type': type } }),
		);

	it('sends the request and returns the body as text with the status in _meta', async () => {
		const send = respond(200, '{"messages":[]}');
		const caller = createHttpToolCaller({
			origin: 'https://www.googleapis.com',
			send,
			headers: () => ({ authorization: 'Bearer real' }),
		});

		const result = await caller.callTool('read_list_messages', {
			method: 'GET',
			path: '/gmail/v1/users/me/messages',
			query: { maxResults: '3' },
		});

		expect(send.mock.calls[0][0].url.toString()).toBe(
			'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=3',
		);
		expect(send.mock.calls[0][0].headers.authorization).toBe('Bearer real');
		expect(result.isError).toBe(false);
		expect(result.content).toEqual([{ type: 'text', text: '{"messages":[]}' }]);
		expect(result._meta).toEqual({ status: 200, contentType: 'application/json' });
	});

	it('marks a status of 400 or more as an error and keeps the body', async () => {
		const caller = createHttpToolCaller({
			origin: 'https://x.test',
			send: respond(404, '{"error":{"code":404}}'),
			headers: () => ({}),
		});

		const result = await caller.callTool('read_get_messages', { method: 'GET', path: '/a' });

		expect(result.isError).toBe(true);
		expect(result._meta?.status).toBe(404);
		expect(result.content).toEqual([{ type: 'text', text: '{"error":{"code":404}}' }]);
	});

	it('applies enrich to a JSON answer only', async () => {
		const enrich = (json: unknown) => ({ wrapped: json });
		const json = createHttpToolCaller({
			origin: 'https://x.test',
			send: respond(200, '{"a":1}'),
			headers: () => ({}),
			enrich,
		});
		const text = createHttpToolCaller({
			origin: 'https://x.test',
			send: respond(200, 'not json', 'text/plain'),
			headers: () => ({}),
			enrich,
		});

		expect((await json.callTool('read_get_a', { method: 'GET', path: '/a' })).content).toEqual([
			{ type: 'text', text: '{"wrapped":{"a":1}}' },
		]);
		expect((await text.callTool('read_get_a', { method: 'GET', path: '/a' })).content).toEqual([
			{ type: 'text', text: 'not json' },
		]);
	});

	it('has no tool list', async () => {
		const caller = createHttpToolCaller({
			origin: 'https://x.test',
			send: respond(200, '{}'),
			headers: () => ({}),
		});

		expect(await caller.listTools()).toEqual([]);
	});
});

describe('createGymSender', () => {
	let server: http.Server;
	let seen: { headers: http.IncomingHttpHeaders; url?: string; method?: string; body: string };
	let gymUrl: string;
	let reply: { status: number; body: string };

	beforeEach(async () => {
		reply = { status: 200, body: '{"ok":true}' };
		server = http.createServer((request, response) => {
			const chunks: Buffer[] = [];
			request.on('data', (c: Buffer) => chunks.push(c));
			request.on('end', () => {
				seen = {
					headers: request.headers,
					url: request.url,
					method: request.method,
					body: Buffer.concat(chunks).toString(),
				};
				response.statusCode = reply.status;
				response.setHeader('content-type', 'application/json');
				response.end(reply.body);
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		gymUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it('sends the request to the gym with the host of the vendor and the token of the tenant', async () => {
		const send = createGymSender({ gymUrl, bearer: () => 'tenant-token' });

		const res = await send(
			req(
				'POST',
				'https://www.googleapis.com/gmail/v1/users/me/messages/send?a=1',
				{ raw: 'abc' },
				{
					authorization: 'Bearer real-secret',
					cookie: 'sid=real-cookie',
					'proxy-authorization': 'Basic real-proxy',
					host: 'wrong',
					'content-length': '999',
					'x-k': 'v',
				},
			),
		);

		expect(await res.json()).toEqual({ ok: true });
		expect(seen.method).toBe('POST');
		expect(seen.url).toBe('/gmail/v1/users/me/messages/send?a=1');
		expect(seen.headers.host).toBe('www.googleapis.com');
		expect(seen.headers.authorization).toBe('Bearer tenant-token');
		expect(seen.headers['x-k']).toBe('v');
		expect(JSON.parse(seen.body)).toEqual({ raw: 'abc' });
		expect(JSON.stringify(seen.headers)).not.toContain('real-secret');
		expect(JSON.stringify(seen.headers)).not.toContain('real-cookie');
		expect(JSON.stringify(seen.headers)).not.toContain('real-proxy');
	});

	it('returns an error status of the gym as it is', async () => {
		reply = { status: 404, body: '{"error":"gone"}' };
		const send = createGymSender({ gymUrl, bearer: () => 't' });

		const res = await send(req('GET', 'https://www.googleapis.com/gmail/v1/users/me/messages/x'));

		expect(res.status).toBe(404);
		expect(await res.text()).toBe('{"error":"gone"}');
	});

	it('rejects when the gym is not reachable', async () => {
		const send = createGymSender({ gymUrl: 'http://127.0.0.1:1', bearer: () => 't' });

		await expect(send(req('GET', 'https://www.googleapis.com/x'))).rejects.toThrow();
	});
});

describe('http tool caller edge cases', () => {
	it('names a root read, a HEAD read of one object, and keeps repeated query keys', () => {
		const root = toToolCall(req('GET', 'https://x.test/'), true);
		const one = toToolCall(req('HEAD', 'https://x.test/files/1a1f32cf20c4c2fb'), true);
		const many = toToolCall(req('GET', 'https://x.test/files?label=a&label=b&label=c'), true);

		expect(root.name).toBe('read_list_root');
		expect(one.name).toBe('read_get_files');
		expect(many.args.query).toEqual({ label: ['a', 'b', 'c'] });
	});

	it('sends a text body as it is, a JSON body with a content type, and no body on a GET', () => {
		const text = fromToolArgs('https://x.test', { method: 'POST', path: '/a', body: 'raw' }, {});
		const json = fromToolArgs('https://x.test', { method: 'POST', path: '/a', body: { a: 1 } }, {});
		const get = fromToolArgs('https://x.test', { method: 'GET', path: '/a', body: { a: 1 } }, {});

		expect(text.body?.toString()).toBe('raw');
		expect(json.headers['content-type']).toBe('application/json');
		expect(get.body).toBeUndefined();
	});

	it('keeps the body when it is no JSON, and marks an error status', async () => {
		const send = vi.fn(
			async (_r: CapturedRequest) =>
				new Response('plain text', { status: 404, headers: { 'content-type': 'text/plain' } }),
		);
		const caller = createHttpToolCaller({
			origin: () => 'https://x.test',
			send,
			headers: () => ({}),
			enrich: () => {
				throw new Error('must not be used for text');
			},
		});

		const result = await caller.callTool('read_x', { method: 'GET', path: '/a' });

		expect(result.isError).toBe(true);
		expect(result.content).toEqual([{ type: 'text', text: 'plain text' }]);
		expect(result._meta).toEqual({ status: 404, contentType: 'text/plain' });
		expect(await caller.listTools()).toEqual([]);
	});

	it('answers a no-content status of the gym without a body', async () => {
		const server = http.createServer((_req, res) => {
			res.statusCode = 204;
			res.end();
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const gymUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
		try {
			const send = createGymSender({ gymUrl, bearer: () => 't' });

			const res = await send(
				req('DELETE', 'https://www.googleapis.com/gmail/v1/users/me/drafts/x'),
			);

			expect(res.status).toBe(204);
			expect(await res.text()).toBe('');
		} finally {
			await new Promise((resolve) => server.close(resolve));
		}
	});
});

describe('Microsoft Graph paths', () => {
	it('drops the v1.0 and the mailbox address from the tool name', () => {
		const call = toToolCall(
			req('GET', 'https://graph.microsoft.com/v1.0/users/bob@x.test/messages'),
			true,
		);

		expect(call.name).toBe('read_list_messages');
	});

	it('treats a long text without a digit as an id', () => {
		const text = 'AAMkAGVmMDEzMTMLTZmYWUtNdkNChMDZiLTUGYOTZhYmYOABGAAAAAAAiQAbcdefghij'.replace(
			/\d/g,
			'x',
		);
		expect(/\d/.test(text)).toBe(false);
		const call = toToolCall(
			req('GET', `https://graph.microsoft.com/v1.0/me/messages/${text}`),
			true,
		);

		expect(call.name).toBe('read_get_messages');
	});
});
