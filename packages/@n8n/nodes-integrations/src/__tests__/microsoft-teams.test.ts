import { mockHttp, runAction } from '@n8n/node-sdk/testing';
import { MicrosoftTeamsOAuth2Api } from 'n8n-nodes-base/dist/credentials/MicrosoftTeamsOAuth2Api.credentials';

import { createTeamsChannelMessage } from '../nodes/microsoft-teams/actions/channel-message.create';
import { createTeamsChatMessage } from '../nodes/microsoft-teams/actions/chat-message.create';

const TEAM = '61165b04-e4cc-4026-b43f-926b4e2a7182';
const CHANNEL = '19:a1b2c3d4e5f6a7b8c9d0@thread.tacv2';
const CHAT = '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2';

const teams = (graphApiBaseUrl = 'https://graph.microsoft.com') => ({
	credential: { type: 'microsoftTeamsOAuth2Api', data: { graphApiBaseUrl } },
	credentials: [new MicrosoftTeamsOAuth2Api()],
});

const sent = (content: string) => ({
	id: '1756717200000',
	replyToId: null,
	messageType: 'message',
	createdDateTime: '2026-09-01T09:00:00.000Z',
	body: { contentType: 'html', content },
});

describe('microsoftTeams.chatMessage.create', () => {
	it('sends to the Graph cloud of the credential and makes an attributed message html', async () => {
		const fetch = mockHttp([
			{ method: 'POST', path: '/messages', reply: { json: sent('Build passed') } },
		]);
		const result = await runAction(createTeamsChatMessage, {
			...teams('https://graph.microsoft.us'),
			input: { chatId: CHAT, message: 'Build <passed>' },
			fetch,
		});

		expect(fetch.calls[0]?.url).toBe(
			`https://graph.microsoft.us/v1.0/chats/${encodeURIComponent(CHAT)}/messages`,
		);
		expect(fetch.calls[0]?.body).toEqual({
			body: {
				contentType: 'html',
				content: expect.stringMatching(/^Build <passed><br><br><em> Powered by .*n8n\.io/),
			},
		});
		expect(result).toMatchObject({ ok: true, items: [{ id: '1756717200000' }] });
	});

	it('refuses a percent-encoded chat ID before any request', async () => {
		const fetch = mockHttp([]);
		const result = await runAction(createTeamsChatMessage, {
			...teams(),
			input: { chatId: encodeURIComponent(CHAT), message: 'Hi' },
			fetch,
		});

		expect(result).toMatchObject({ ok: false, error: { path: 'input.chatId' } });
		expect(fetch.calls).toEqual([]);
	});
});

describe('microsoftTeams.channelMessage.create', () => {
	it('replies in a thread and keeps the text content type without attribution', async () => {
		const fetch = mockHttp([{ method: 'POST', path: '/replies', reply: { json: sent('Fixed') } }]);
		await runAction(createTeamsChannelMessage, {
			...teams(),
			input: {
				teamId: TEAM,
				channelId: CHANNEL,
				message: 'Fixed',
				replyToId: '1756717200000',
				appendAttribution: false,
			},
			fetch,
		});

		expect(fetch.calls[0]?.path).toBe(
			`/v1.0/teams/${TEAM}/channels/${encodeURIComponent(CHANNEL)}/messages/1756717200000/replies`,
		);
		expect(fetch.calls[0]?.body).toEqual({ body: { contentType: 'text', content: 'Fixed' } });
	});

	it('names the Graph reason and keeps the HTTP status', async () => {
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/messages',
				reply: {
					status: 403,
					json: { error: { code: 'Forbidden', message: 'Missing role permissions' } },
				},
			},
		]);
		const result = await runAction(createTeamsChannelMessage, {
			...teams(),
			input: { teamId: TEAM, channelId: CHANNEL, message: 'Hi' },
			fetch,
		});

		expect(result).toEqual({
			ok: false,
			error: {
				message: 'Microsoft Teams refused the message: Missing role permissions',
				httpStatus: 403,
			},
		});
	});
});
