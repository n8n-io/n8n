import { mock } from 'vitest-mock-extended';
import type { HttpRequestClient } from '@n8n/backend-network';
import { slackHitl } from '../../integrations/platforms/slack/slack-hitl';
import { discordHitl } from '../../integrations/platforms/discord/discord-hitl';

it('keeps Slack pagination when the search has no match on the current page', async () => {
	if (!slackHitl.supported) throw new Error('Expected Slack support');
	const httpClient = mock<HttpRequestClient>();
	httpClient.request.mockResolvedValue({
		ok: true,
		members: [{ id: 'U1', name: 'one' }],
		response_metadata: { next_cursor: 'page-two' },
	});
	expect(
		await slackHitl.listOptions({
			httpClient,
			credential: { accessToken: 'test-token' },
			query: { channel: 'slack', credentialId: 'credential', field: 'user', query: 'two' },
		}),
	).toEqual({ options: [], nextCursor: 'page-two' });
	httpClient.request.mockResolvedValue({
		ok: true,
		members: [
			{ id: 'U2', name: 'two' },
			{ id: 'B1', name: 'bot', is_bot: true },
		],
	});
	expect(
		await slackHitl.listOptions({
			httpClient,
			credential: { accessToken: 'test-token' },
			query: {
				channel: 'slack',
				credentialId: 'credential',
				field: 'user',
				query: 'two',
				cursor: 'page-two',
			},
		}),
	).toEqual({ options: [{ id: 'U2', name: 'two' }], nextCursor: undefined });
	expect(httpClient.request).toHaveBeenLastCalledWith(
		expect.objectContaining({
			url: expect.stringContaining('cursor=page-two'),
			disableFollowRedirect: true,
		}),
	);
});
it('lists Discord servers, writable channel types, and human users', async () => {
	if (!discordHitl.supported) throw new Error('Expected Discord support');
	const httpClient = mock<HttpRequestClient>();
	const query = {
		channel: 'discord',
		credentialId: 'credential',
		field: 'guild',
		query: '',
	} as const;
	httpClient.request.mockResolvedValue([{ id: '42', name: 'Server' }]);
	expect(
		await discordHitl.listOptions({ httpClient, credential: { botToken: 'test' }, query }),
	).toMatchObject({ options: [{ id: '42', name: 'Server' }] });
	httpClient.request.mockResolvedValue([
		{ id: '1', name: 'approvals', type: 0 },
		{ id: '2', name: 'voice', type: 2 },
	]);
	expect(
		await discordHitl.listOptions({
			httpClient,
			credential: { botToken: 'test' },
			query: { ...query, field: 'channel', guildId: '42' },
		}),
	).toMatchObject({ options: [{ id: '1', name: '#approvals' }] });
	httpClient.request.mockResolvedValue([
		{ user: { id: '1', username: 'user' } },
		{ user: { id: '2', username: 'bot', bot: true } },
	]);
	expect(
		await discordHitl.listOptions({
			httpClient,
			credential: { botToken: 'test' },
			query: { ...query, field: 'user', guildId: '42' },
		}),
	).toMatchObject({ options: [{ id: '1', name: 'user' }] });
});
