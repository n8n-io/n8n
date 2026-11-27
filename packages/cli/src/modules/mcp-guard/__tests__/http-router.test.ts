import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { HttpGuardRouter, type HttpGuardRouterDeps } from '../http-router';
import { GMAIL_PROFILE } from '../http-profiles';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { currentRequestContext } from '../request-context';

const result = (body: unknown, status = 200): CallToolResult => ({
	isError: status >= 400,
	content: [{ type: 'text', text: JSON.stringify(body) }],
	_meta: { status, contentType: 'application/json' },
});

const request = (method: string, path: string, body?: unknown, host = 'www.googleapis.com') =>
	({
		method,
		url: new URL(`https://${host}${path}`),
		headers: { authorization: 'Bearer real-token' },
		body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
	}) satisfies CapturedRequest;

const LIST = '/gmail/v1/users/me/messages';
const ID = '1a1f32cf20c4c2fb';

function setup(over: Partial<HttpGuardRouterDeps> = {}) {
	const upstream = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ messages: [{ id: 'real1' }] })),
	};
	const gym = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ messages: [{ id: ID }] })),
	};
	const hydrator = {
		hydrate: vi.fn(async (..._a: unknown[]) => {}),
		hydrateWrite: vi.fn(async (..._a: unknown[]) => {}),
		noteWrite: vi.fn(),
	};
	const router = new HttpGuardRouter({
		upstream: upstream as unknown as McpCaller,
		gym: gym as unknown as McpCaller,
		hydrator,
		profile: GMAIL_PROFILE,
		...over,
	});
	return { router, upstream, gym, hydrator };
}

describe('HttpGuardRouter', () => {
	it('refuses a host that has no vendor file, and calls nothing', async () => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(request('GET', '/x', undefined, 'example.com'));

		expect(res.status).toBe(403);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).not.toHaveBeenCalled();
	});

	it('refuses another Google API on the same host', async () => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(request('GET', '/tasks/v1/users/@me/lists'));

		expect(res.status).toBe(403);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).not.toHaveBeenCalled();
	});

	it('sends a write only to the gym and never to the real service', async () => {
		const { router, upstream, gym, hydrator } = setup();
		gym.callTool.mockResolvedValueOnce(result({ id: 'gym-sent', threadId: 'gym-sent' }));

		const res = await router.handle(request('POST', `${LIST}/send`, { raw: 'abc' }));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 'gym-sent', threadId: 'gym-sent' });
		expect(upstream.callTool).toHaveBeenCalledTimes(0);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
		expect(gym.callTool.mock.calls[0][0]).toBe('write_post_messages_send');
		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
		expect(hydrator.noteWrite).toHaveBeenCalledTimes(1);
	});

	it.each([204, 205, 304])(
		'answers a write of the gym with status %i and no body',
		async (status) => {
			const { router, gym } = setup();
			gym.callTool.mockResolvedValueOnce({
				content: [{ type: 'text', text: '' }],
				_meta: { status, contentType: 'application/json' },
			});

			const res = await router.handle(request('DELETE', `${LIST}/${ID}`));

			expect(res.status).toBe(status);
			expect(await res.text()).toBe('');
		},
	);

	it.each(['PUT', 'PATCH', 'DELETE', 'POST'])(
		'never lets a %s reach the real service',
		async (method) => {
			const { router, upstream } = setup();

			await router.handle(request(method, `${LIST}/${ID}`, method === 'DELETE' ? undefined : {}));

			expect(upstream.callTool).not.toHaveBeenCalled();
		},
	);

	it('reads the real service, hydrates the gym, and answers from the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();

		const res = await router.handle(request('GET', LIST));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(upstream.callTool.mock.calls[0][0]).toBe('read_list_messages');
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate.mock.calls[0][0]).toBe('read_list_messages');
		expect(gym.callTool).toHaveBeenCalledTimes(1);
		expect(await res.json()).toEqual({ messages: [{ id: ID }] });
	});

	it('hydrates before the gym answers', async () => {
		const order: string[] = [];
		const { router, gym, hydrator } = setup();
		hydrator.hydrate.mockImplementation(async () => {
			order.push('hydrate');
		});
		gym.callTool.mockImplementation(async () => {
			order.push('gym');
			return result({});
		});

		await router.handle(request('GET', LIST));

		expect(order).toEqual(['hydrate', 'gym']);
	});

	it('answers from the gym when the real read fails, without hydration', async () => {
		const { router, upstream, gym, hydrator } = setup();
		upstream.callTool.mockResolvedValueOnce(result({ error: 'not found' }, 404));

		const res = await router.handle(request('GET', `${LIST}/${ID}`));

		expect(hydrator.hydrate).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
		expect(res.status).toBe(200);
	});

	it('answers from the gym when the real read throws', async () => {
		const { router, upstream, gym } = setup();
		upstream.callTool.mockRejectedValueOnce(new Error('network down'));

		const res = await router.handle(request('GET', LIST));

		expect(gym.callTool).toHaveBeenCalledTimes(1);
		expect(res.status).toBe(200);
	});

	it('returns the error status of the gym as it is', async () => {
		const { router, gym } = setup();
		gym.callTool.mockResolvedValueOnce(result({ error: { code: 404 } }, 404));

		const res = await router.handle(request('GET', `${LIST}/${ID}`));

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: { code: 404 } });
	});

	it('skips the real read for an id that the gym made', async () => {
		const { router, upstream, gym } = setup();
		await router.handle(request('GET', LIST));
		upstream.callTool.mockClear();

		await router.handle(request('GET', `${LIST}/${ID}`));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(2);
	});

	it('hydrates a write that names a message the gym did not make, before the gym call', async () => {
		const order: string[] = [];
		const { router, gym, hydrator } = setup();
		hydrator.hydrateWrite.mockImplementation(async () => {
			order.push('hydrateWrite');
		});
		gym.callTool.mockImplementation(async () => {
			order.push('gym');
			return result({});
		});

		await router.handle(
			request('POST', `${LIST}/1b2e43df31d5d3ac/modify`, { addLabelIds: ['STARRED'] }),
		);

		expect(order).toEqual(['hydrateWrite', 'gym']);
	});

	it('does not hydrate a write on a message that the gym made', async () => {
		const { router, hydrator } = setup();
		await router.handle(request('GET', LIST));

		await router.handle(request('POST', `${LIST}/${ID}/modify`, { addLabelIds: ['STARRED'] }));

		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
	});

	it('still calls the gym when the hydration of a write fails', async () => {
		const { router, gym, hydrator } = setup();
		hydrator.hydrateWrite.mockRejectedValueOnce(new Error('model failed'));

		await router.handle(request('POST', `${LIST}/1b2e43df31d5d3ac/modify`, {}));

		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('still answers when the hydration of a read fails', async () => {
		const { router, hydrator } = setup();
		hydrator.hydrate.mockRejectedValueOnce(new Error('model failed'));

		const res = await router.handle(request('GET', LIST));

		expect(res.status).toBe(200);
	});

	it('does not hydrate a label list that has only system labels', async () => {
		const { router, upstream, hydrator } = setup();
		upstream.callTool.mockResolvedValueOnce(result({ labels: [{ id: 'INBOX', type: 'system' }] }));

		await router.handle(request('GET', '/gmail/v1/users/me/labels'));

		expect(hydrator.hydrate).not.toHaveBeenCalled();
	});

	it('returns 502 when the gym cannot be reached', async () => {
		const { router, gym } = setup();
		gym.callTool.mockRejectedValueOnce(new Error('connect refused'));

		const res = await router.handle(request('POST', `${LIST}/send`, {}));

		expect(res.status).toBe(502);
	});

	it('gives the real reads the credential and the host of the request', async () => {
		const { router, upstream, hydrator } = setup();
		const seen: unknown[] = [];
		hydrator.hydrate.mockImplementationOnce(async () => {
			seen.push(currentRequestContext());
		});
		upstream.callTool.mockImplementationOnce(async () => {
			seen.push(currentRequestContext());
			return result({ messages: [] });
		});

		await router.handle(request('GET', LIST, undefined, 'gmail.googleapis.com'));

		for (const context of seen) {
			expect(context).toEqual({
				authorization: 'Bearer real-token',
				origin: 'https://gmail.googleapis.com',
			});
		}
	});

	it('keeps the credential of each request when two requests run at the same time', async () => {
		const { router, hydrator } = setup();
		const seen: Record<string, string | undefined> = {};
		hydrator.hydrate.mockImplementation(async () => {
			const before = currentRequestContext().authorization ?? 'none';
			await new Promise((resolve) => setTimeout(resolve, before === 'Bearer a' ? 20 : 1));
			seen[before] = currentRequestContext().authorization;
		});
		const withToken = (token: string) => ({
			...request('GET', LIST),
			headers: { authorization: token },
		});

		await Promise.all([router.handle(withToken('Bearer a')), router.handle(withToken('Bearer b'))]);

		expect(seen).toEqual({ 'Bearer a': 'Bearer a', 'Bearer b': 'Bearer b' });
	});

	it('answers an error result without a status as 500 with a JSON content type', async () => {
		const bare: CallToolResult = { isError: true, content: [{ type: 'text', text: '{"e":1}' }] };
		const { router, gym } = setup();
		gym.callTool.mockResolvedValueOnce(bare);

		const res = await router.handle(request('GET', `${LIST}/${ID}`));

		expect(res.status).toBe(500);
		expect(res.headers.get('content-type')).toBe('application/json');
	});

	it('sends a real read without a credential when the request has none', async () => {
		const { router, upstream } = setup();
		let authorization: string | undefined = 'unset';
		upstream.callTool.mockImplementationOnce(async () => {
			authorization = currentRequestContext().authorization;
			return result({ messages: [] });
		});

		await router.handle({ ...request('GET', LIST), headers: {} });

		expect(authorization).toBeUndefined();
	});

	it('returns a 401 of the real read to the node, so that the node refreshes its token', async () => {
		const { router, upstream, gym, hydrator } = setup();
		upstream.callTool.mockResolvedValueOnce(result({ error: 'expired' }, 401));

		const res = await router.handle(request('GET', LIST));

		expect(res.status).toBe(401);
		expect(gym.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
	});

	it('answers a gym 204 without a body', async () => {
		const { router, gym } = setup();
		gym.callTool.mockResolvedValueOnce({ content: [], _meta: { status: 204 } });
		const res = await router.handle(request('DELETE', `${LIST}/${ID}`));
		expect(res.status).toBe(204);
		expect(await res.text()).toBe('');
	});
});

describe('HttpGuardRouter with ids of another vendor', () => {
	it('skips the real read for an id that a router of the same tenant made', async () => {
		const gymIds = new Set<string>(['1gymMade0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2xyz']);
		const { router, upstream, gym } = setup({ gymIds });

		await router.handle(request('GET', `${LIST}/1gymMade0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2xyz`));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('writes the ids that it made into the shared set', async () => {
		const gymIds = new Set<string>();
		const { router, gym } = setup({ gymIds });
		gym.callTool.mockResolvedValueOnce(result({ id: 'newGymObject123456' }));

		await router.handle(request('POST', `${LIST}/send`, { raw: 'abc' }));

		expect(gymIds.has('newGymObject123456')).toBe(true);
	});
});

describe('HttpGuardRouter real read failures', () => {
	it.each([403, 500, 503])('returns a %i of the real read to the node', async (status) => {
		const { router, upstream, gym, hydrator } = setup();
		upstream.callTool.mockResolvedValueOnce(result({ error: 'failed' }, status));

		const res = await router.handle(request('GET', LIST));

		expect(res.status).toBe(status);
		expect(gym.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
	});

	it('leaves a 404 of the real read to the gym, for an id that only the gym knows', async () => {
		const { router, upstream, gym } = setup();
		upstream.callTool.mockResolvedValueOnce(result({ error: 'not found' }, 404));

		const res = await router.handle(request('GET', `${LIST}/${ID}`));

		expect(res.status).toBe(200);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});
});

describe('HttpGuardRouter with real ids', () => {
	const REAL = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
	const MADE = '1gymMade0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2xyz';
	const withRealIds = { ...GMAIL_PROFILE, opaqueIds: true };

	it('does not take an id of a read answer as an id of the gym', async () => {
		const { router, upstream, gym } = setup({ profile: withRealIds });
		gym.callTool.mockResolvedValue(result({ id: REAL }));
		await router.handle(request('GET', LIST));
		upstream.callTool.mockClear();

		await router.handle(request('GET', `${LIST}/${REAL}`));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
	});

	it('takes an id of a write answer as an id of the gym, also in a path with a range', async () => {
		const { router, upstream, gym, hydrator } = setup({ profile: withRealIds });
		gym.callTool.mockResolvedValue(result({ spreadsheetId: MADE }));
		await router.handle(request('POST', `${LIST}/send`, { raw: 'abc' }));
		upstream.callTool.mockClear();

		await router.handle(request('GET', `${LIST}/${MADE}/Sheet1!A1:C10`));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
	});
});

describe('HttpGuardRouter ids with encoded characters', () => {
	it('answers a read of an id of the gym from the gym only, also when the path encodes the id', async () => {
		const { router, upstream, gym } = setup();
		const gymId = 'AAMkAGym+Id/with+chars0123456789012345678901234567890';
		gym.callTool.mockResolvedValueOnce(result({ id: gymId, parentFolderId: 'folderid0123456789' }));
		await router.handle(request('POST', '/gmail/v1/users/me/drafts', {}));

		await router.handle(request('GET', `/gmail/v1/users/me/messages/${encodeURIComponent(gymId)}`));

		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('records the parent folder id of an answer of the gym as an id of the gym', async () => {
		const { router, upstream, gym } = setup();
		gym.callTool.mockResolvedValueOnce(result({ id: 'a', parentFolderId: 'folderid0123456789' }));
		await router.handle(request('POST', '/gmail/v1/users/me/drafts', {}));

		await router.handle(request('GET', '/gmail/v1/users/me/labels/folderid0123456789'));

		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('keeps a path with a broken escape as it is', async () => {
		const { router, upstream } = setup();

		await router.handle(request('GET', '/gmail/v1/users/me/messages/1a1f32cf%ZZ'));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
	});
});
