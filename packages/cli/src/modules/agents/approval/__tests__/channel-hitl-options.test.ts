import { mock } from 'vitest-mock-extended';
import type { HttpRequestClient } from '@n8n/backend-network';
import { slackHitl } from '../../integrations/platforms/slack/slack-hitl';
import { discordHitl } from '../../integrations/platforms/discord/discord-hitl';

it('combines Slack channels and users and pages only unfinished lists', async () => {
	if (!slackHitl.supported) throw new Error('Expected Slack support');
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
						{ id: 'U2', name: 'Second reviewer' },
						{ id: 'B1', name: 'Bot', is_bot: true },
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
	expect(first.options).toEqual([
		{ id: 'C1', name: '#approvals', kind: 'channel' },
		{ id: 'U1', name: 'Reviewer', kind: 'user' },
	]);
	expect(first.nextCursor).toBe(JSON.stringify({ user: 'next' }));
	httpClient.request.mockClear();
	expect(
		await slackHitl.listOptions({
			...context,
			query: { ...context.query, cursor: first.nextCursor },
		}),
	).toEqual({
		options: [{ id: 'U2', name: 'Second reviewer', kind: 'user' }],
		nextCursor: undefined,
	});
	expect(httpClient.request).toHaveBeenCalledOnce();
	expect(httpClient.request).toHaveBeenCalledWith(
		expect.objectContaining({
			url: expect.stringContaining('users.list?limit=200&cursor=next'),
			disableFollowRedirect: true,
		}),
	);
});

it('preserves a continuation when neither Slack list matches on this page', async () => {
	if (!slackHitl.supported) throw new Error('Expected Slack support');
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockImplementation(async ({ url }) =>
		String(url).includes('users.list')
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
	).toEqual({ options: [], nextCursor: JSON.stringify({ user: 'page-two' }) });
});

it('combines Discord text channels and people from the selected server', async () => {
	if (!discordHitl.supported) throw new Error('Expected Discord support');
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
	if (!slackHitl.supported) throw new Error('Expected Slack support');
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
