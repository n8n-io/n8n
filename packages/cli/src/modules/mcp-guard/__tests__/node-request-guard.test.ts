import { Container } from '@n8n/di';
import { Readable } from 'node:stream';

import { HttpGuardService } from '../http-guard.service';
import { HttpSimulator } from '../http-simulator';
import type { HydrationModel } from '../hydration-llm';
import { createNodeRequestGuard, toCapturedRequest } from '../node-request-guard';

describe('toCapturedRequest', () => {
	it('builds the url from an absolute url and a query with a list', () => {
		const req = toCapturedRequest({
			url: 'https://www.googleapis.com/gmail/v1/users/me/messages',
			qs: { maxResults: 3, labelIds: ['INBOX', 'UNREAD'], skip: undefined, none: null },
		});

		expect(req.method).toBe('GET');
		expect(req.url.toString()).toBe(
			'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=3&labelIds=INBOX&labelIds=UNREAD',
		);
		expect(req.body).toBeUndefined();
	});

	it('joins a relative url to the base url', () => {
		const req = toCapturedRequest({ url: '/v1/items', baseURL: 'https://api.example.test/' });

		expect(req.url.toString()).toBe('https://api.example.test/v1/items');
	});

	it('lowercases header names, keeps the token and adds basic auth only when there is none', () => {
		const withToken = toCapturedRequest({
			url: 'https://a.test/x',
			headers: { Authorization: 'Bearer t', 'X-N': 5 },
			auth: { username: 'jo', password: 'pw' },
		});
		const withAuth = toCapturedRequest({
			url: 'https://a.test/x',
			auth: { username: 'jo', password: 'pw' },
		});

		expect(withToken.headers).toEqual({ authorization: 'Bearer t', 'x-n': '5' });
		expect(withAuth.headers.authorization).toBe(`Basic ${Buffer.from('jo:pw').toString('base64')}`);
	});

	it('reads an object body as JSON and sets the content type once', () => {
		const req = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: { raw: 'abc' },
			headers: {},
		});

		expect(req.method).toBe('POST');
		expect(JSON.parse(req.body?.toString() ?? '')).toEqual({ raw: 'abc' });
		expect(req.headers['content-type']).toBe('application/json');
		const typed = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: { raw: 'abc' },
			headers: { 'Content-Type': 'application/vnd.test+json' },
		});
		expect(typed.headers['content-type']).toBe('application/vnd.test+json');
	});

	it('reads a text, a buffer and a form-encoded body as they are', () => {
		const text = toCapturedRequest({ url: 'https://a.test/x', method: 'POST', body: 'raw' });
		const buffer = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: Buffer.from('bin'),
		});
		const form = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: new URLSearchParams({ a: '1' }),
		});

		expect(text.body?.toString()).toBe('raw');
		expect(buffer.body?.toString()).toBe('bin');
		expect(form.body?.toString()).toBe('a=1');
	});

	it('drops a stream and a multipart form, so the guard sees a request without a body', () => {
		const stream = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: Readable.from(['x']) as never,
		});
		const multipart = toCapturedRequest({
			url: 'https://a.test/x',
			method: 'POST',
			body: { getHeaders: () => ({}), append: () => {} } as never,
		});

		expect(stream.body).toBeUndefined();
		expect(multipart.body).toBeUndefined();
	});
});

describe('createNodeRequestGuard', () => {
	const model: HydrationModel = { resolve: async () => ({}) as never };
	const scope = { model, chatId: 'chat1', agentId: 'agent1' };
	const handle = vi.fn();

	beforeEach(() => {
		handle.mockReset();
		Container.set(HttpGuardService, { handle } as unknown as HttpGuardService);
	});

	it('gives the request and the scope to the guard service and returns a JSON answer', async () => {
		handle.mockResolvedValue(
			Response.json({ messages: [] }, { status: 201, headers: { 'x-a': 'b' } }),
		);

		const answer = await createNodeRequestGuard(scope)(
			{ url: 'https://www.googleapis.com/gmail/v1/users/me/messages' },
			{} as never,
		);

		expect(handle).toHaveBeenCalledWith(
			expect.objectContaining({ method: 'GET', url: expect.any(URL) }),
			scope,
		);
		expect(answer).toMatchObject({
			statusCode: 201,
			body: { messages: [] },
			headers: { 'x-a': 'b' },
		});
	});

	it.each(['arraybuffer', 'blob'] as const)(
		'returns the bytes of the answer unchanged for the encoding %s',
		async (encoding) => {
			const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80, 0xc3, 0x28]);
			handle.mockResolvedValue(
				new Response(new Uint8Array(bytes), { headers: { 'content-type': 'application/pdf' } }),
			);

			const answer = (await createNodeRequestGuard(scope)(
				{ url: 'https://www.googleapis.com/drive/v3/files/x/export', encoding },
				{} as never,
			)) as { body: Buffer };

			expect(Buffer.isBuffer(answer.body)).toBe(true);
			expect(answer.body.equals(bytes)).toBe(true);
		},
	);

	it('returns a readable stream for the body of a stream answer, and bytes for a full response', async () => {
		const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
		handle.mockImplementation(async () => new Response(new Uint8Array(bytes)));
		const guard = createNodeRequestGuard(scope);
		const url = 'https://www.googleapis.com/drive/v3/files/x/export';

		const body = (await guard({ url, encoding: 'stream' }, {} as never)) as {
			body: Readable;
		};
		const chunks: Buffer[] = [];
		for await (const chunk of body.body) chunks.push(chunk as Buffer);
		const full = (await guard(
			{ url, encoding: 'stream', returnFullResponse: true },
			{} as never,
		)) as { body: Buffer };

		expect(body.body).toBeInstanceOf(Readable);
		expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
		expect(Buffer.isBuffer(full.body)).toBe(true);
	});

	it('returns text for an answer that is no JSON, and keeps broken JSON as text', async () => {
		handle.mockResolvedValueOnce(new Response('plain', { status: 403 }));
		handle.mockResolvedValueOnce(
			new Response('{broken', { headers: { 'content-type': 'application/json' } }),
		);
		const guard = createNodeRequestGuard(scope);

		expect(await guard({ url: 'https://a.test/x' }, {} as never)).toMatchObject({
			statusCode: 403,
			body: 'plain',
		});
		expect(await guard({ url: 'https://a.test/x' }, {} as never)).toMatchObject({
			body: '{broken',
		});
	});

	describe('a call of the HTTP Request node', () => {
		const respond = vi.fn();
		const httpNode = { name: 'HTTP Request', type: 'n8n-nodes-base.httpRequestTool' } as never;
		const simulated = { statusCode: 200, headers: {}, body: { simulated: true } };

		beforeEach(() => {
			respond.mockReset().mockResolvedValue(simulated);
			Container.set(HttpSimulator, { respond } as unknown as HttpSimulator);
		});

		it('goes to the simulator when no vendor serves the host', async () => {
			const options = { url: 'https://api.unknown.test/items', method: 'POST' as const };

			const answer = await createNodeRequestGuard(scope)(options, httpNode);

			expect(answer).toBe(simulated);
			expect(respond).toHaveBeenCalledWith(options, httpNode, scope);
			expect(handle).not.toHaveBeenCalled();
		});

		it('goes to the guard when a vendor serves the host', async () => {
			handle.mockResolvedValue(Response.json({ messages: [] }));

			await createNodeRequestGuard(scope)(
				{ url: 'https://www.googleapis.com/gmail/v1/users/me/messages' },
				httpNode,
			);

			expect(handle).toHaveBeenCalledTimes(1);
			expect(respond).not.toHaveBeenCalled();
		});

		it('lets a token exchange of a vendor go to the guard', async () => {
			handle.mockResolvedValue(undefined);

			await createNodeRequestGuard(scope)(
				{ url: 'https://oauth2.googleapis.com/token', method: 'POST' },
				httpNode,
			);

			expect(handle).toHaveBeenCalledTimes(1);
			expect(respond).not.toHaveBeenCalled();
		});

		it('keeps the refusal for a node that is not the HTTP Request node', async () => {
			handle.mockResolvedValue(new Response('no', { status: 403 }));

			const answer = await createNodeRequestGuard(scope)(
				{ url: 'https://api.unknown.test/items' },
				{ name: 'Gmail', type: 'n8n-nodes-base.gmail' } as never,
			);

			expect(answer).toMatchObject({ statusCode: 403 });
			expect(respond).not.toHaveBeenCalled();
		});
	});

	it('leaves the request to the node when the guard service has no answer', async () => {
		handle.mockResolvedValue(undefined);

		expect(
			await createNodeRequestGuard(scope)(
				{ url: 'https://oauth2.googleapis.com/token' },
				{} as never,
			),
		).toBeUndefined();
	});
});
