import { mock } from 'vitest-mock-extended';
import type { HttpRequestClient } from '@n8n/backend-network';
import { slackHitl } from '../../integrations/platforms/slack/slack-hitl';
import { discordHitl } from '../../integrations/platforms/discord/discord-hitl';

it('fills a Slack destination page across sparse provider pages and resumes without skipping matches', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async (request) => {
		const url = String(request.url);
		if (url.includes('conversations.list'))
			return {
				ok: true,
				channels: [
					{ id: 'C1', name: 'approvals', is_member: true },
					{ id: 'C2', name: 'unjoined', is_member: false },
				],
			};
		return url.includes('cursor=next')
			? {
					ok: true,
					members: [
						{ id: 'B1', name: 'Bot', is_bot: true },
						...Array.from({ length: 25 }, (_, index) => ({
							id: `U${index + 2}`,
							name: `Reviewer ${index + 2}`,
						})),
					],
				}
			: {
					ok: true,
					members: [{ id: 'U1', name: 'Reviewer' }],
					response_metadata: { next_cursor: 'next' },
				};
	});
	const context = {
		httpClient,
		credential: { accessToken: 'test' },
		query: { channel: 'slack', credentialId: 'credential', field: 'recipient', query: '' },
	} as const;
	const first = await slackHitl.listOptions(context);
	expect(first.options.map(({ id }) => id)).toEqual([
		'C1',
		...Array.from({ length: 19 }, (_, index) => `U${index + 1}`),
	]);
	expect(first.nextCursor).toBeDefined();
	expect(httpClient.request).toHaveBeenCalledTimes(3);
	httpClient.request.mockClear();

	const second = await slackHitl.listOptions({
		...context,
		query: { ...context.query, cursor: first.nextCursor },
	});
	expect(second.options.map(({ id }) => id)).toEqual(
		Array.from({ length: 7 }, (_, index) => `U${index + 20}`),
	);
	expect(second.nextCursor).toBeUndefined();
	expect(httpClient.request).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			url: expect.stringContaining('users.list?limit=200&cursor=next'),
			disableFollowRedirect: true,
		}),
	);
});

it('searches the next Slack page when the first has no matches', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) =>
		String(url).includes('cursor=page-two')
			? { ok: true, members: [{ id: 'U2', name: 'two' }] }
			: String(url).includes('users.list')
				? {
						ok: true,
						members: [{ id: 'U1', name: 'one' }],
						response_metadata: { next_cursor: 'page-two' },
					}
				: { ok: true, channels: [] },
	);
	expect(
		await slackHitl.listOptions({
			httpClient,
			credential: { accessToken: 'test' },
			query: { channel: 'slack', credentialId: 'credential', field: 'recipient', query: 'two' },
		}),
	).toEqual({ options: [{ id: 'U2', name: 'two', kind: 'user' }], nextCursor: undefined });
});

it('combines Discord text channels and people from the selected server', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) =>
		String(url).includes('/members?')
			? [
					{ user: { id: '1', username: 'reviewer' } },
					{ user: { id: '2', username: 'bot', bot: true } },
				]
			: String(url).includes('/channels?')
				? [
						{ id: '3', name: 'approvals', type: 0 },
						{ id: '4', name: 'voice', type: 2 },
					]
				: [{ id: '42', name: 'Server' }],
	);
	const context = {
		httpClient,
		credential: { botToken: 'test' },
		query: { channel: 'discord', credentialId: 'credential', field: 'guild', query: '' },
	} as const;
	expect(await discordHitl.listOptions(context)).toMatchObject({
		options: [{ id: '42', name: 'Server' }],
	});
	expect(
		await discordHitl.listOptions({
			...context,
			query: { ...context.query, field: 'recipient', guildId: '42' },
		}),
	).toEqual({
		options: [
			{ id: '3', name: '#approvals', kind: 'channel' },
			{ id: '1', name: 'reviewer', kind: 'user' },
		],
		nextCursor: undefined,
	});
});

it('rejects malformed destination cursors before contacting a platform', async () => {
	const httpClient = mock<HttpRequestClient>();
	await expect(
		slackHitl.listOptions({
			httpClient,
			credential: {},
			query: {
				channel: 'slack',
				credentialId: 'credential',
				field: 'recipient',
				query: '',
				cursor: 'invalid',
			},
		}),
	).rejects.toThrow('Invalid destination page');
	expect(httpClient.request).not.toHaveBeenCalled();
});

it('pages Discord servers after a full page of 20 rows', async () => {
	const httpClient = mock<HttpRequestClient>();
	const fullPage = Array.from({ length: 20 }, (_, index) => ({
		id: String(index + 1),
		name: `Server ${index + 1}`,
	}));
	httpClient.request.mockImplementation(async ({ url }) =>
		String(url).includes('after=20') ? [{ id: '21', name: 'Last server' }] : fullPage,
	);
	const context = {
		httpClient,
		credential: { botToken: 'test' },
		query: { channel: 'discord', credentialId: 'credential', field: 'guild', query: '' },
	} as const;

	const first = await discordHitl.listOptions(context);
	expect(first.options).toHaveLength(20);
	expect(first.nextCursor).toBe('20');

	const second = await discordHitl.listOptions({
		...context,
		query: { ...context.query, cursor: first.nextCursor },
	});
	expect(second).toEqual({ options: [{ id: '21', name: 'Last server' }], nextCursor: undefined });
	expect(httpClient.request).toHaveBeenLastCalledWith(
		expect.objectContaining({
			url: 'https://discord.com/api/v10/users/@me/guilds?limit=20&after=20',
		}),
	);
});

it.each([
	['server', { field: 'guild', cursor: 'next' }],
	['destination', { field: 'recipient', guildId: '42', cursor: JSON.stringify({ user: 'next' }) }],
] as const)('rejects a non-numeric Discord %s cursor before any request', async (_label, query) => {
	const httpClient = mock<HttpRequestClient>();
	await expect(
		discordHitl.listOptions({
			httpClient,
			credential: { botToken: 'test' },
			query: { channel: 'discord', credentialId: 'credential', query: '', ...query },
		}),
	).rejects.toThrow('Invalid Discord page');
	expect(httpClient.request).not.toHaveBeenCalled();
});

it('returns Discord channels when the bot cannot list server members', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) => {
		if (String(url).includes('/members?'))
			throw Object.assign(new Error('Missing Access'), { response: { status: 403 } });
		return [{ id: '3', name: 'approvals', type: 0 }];
	});

	expect(
		await discordHitl.listOptions({
			httpClient,
			credential: { botToken: 'test' },
			query: {
				channel: 'discord',
				credentialId: 'credential',
				field: 'recipient',
				guildId: '42',
				query: '',
			},
		}),
	).toEqual({ options: [{ id: '3', name: '#approvals', kind: 'channel' }], nextCursor: undefined });
});

it('searches Discord members by name without listing server members', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) => {
		const request = new URL(String(url));
		if (request.pathname.endsWith('/members'))
			throw Object.assign(new Error('Missing Access'), { response: { status: 403 } });
		if (request.pathname.endsWith('/members/search'))
			return [
				{ nick: 'On-call reviewer', user: { id: '1', username: 'alex' } },
				{ user: { id: '2', username: 'alex-bot', bot: true } },
			];
		return [{ id: '3', name: 'approvals', type: 0 }];
	});
	const context = {
		httpClient,
		credential: { botToken: 'test' },
		query: {
			channel: 'discord',
			credentialId: 'credential',
			field: 'recipient',
			guildId: '42',
			query: '',
		},
	} as const;

	expect(
		await discordHitl.listOptions({ ...context, query: { ...context.query, query: '@Alex' } }),
	).toEqual({
		options: [{ id: '1', name: 'On-call reviewer', kind: 'user' }],
		nextCursor: undefined,
	});
	expect(httpClient.request).toHaveBeenCalledWith(
		expect.objectContaining({
			url: 'https://discord.com/api/v10/guilds/42/members/search?limit=10&query=alex',
		}),
	);
	expect(httpClient.request).not.toHaveBeenCalledWith(
		expect.objectContaining({ url: expect.stringContaining('/members?') }),
	);
});

it('fails the Discord lookup on other member errors', async () => {
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) => {
		if (String(url).includes('/members?'))
			throw Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
		return [];
	});

	await expect(
		discordHitl.listOptions({
			httpClient,
			credential: { botToken: 'test' },
			query: {
				channel: 'discord',
				credentialId: 'credential',
				field: 'recipient',
				guildId: '42',
				query: '',
			},
		}),
	).rejects.toThrow('Unauthorized');
});
