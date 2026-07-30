import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import {
	createSlackReplayContext,
	type SlackReplayFixtures,
} from '../../../__tests__/helpers/slack/replay-test-context';
import type { ChannelIntegrationRecord } from '../../../recording/channel-integration-recorder';

const recordedSession = jsonParse<ChannelIntegrationRecord[]>(
	readFileSync(join(__dirname, '../../../__tests__/fixtures/slack/recorded-session.json'), 'utf8'),
);

function recordedWebhook(eventId: string) {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'webhook' }> => {
			if (entry.type !== 'webhook' || entry.platform !== 'slack') return false;
			const body = jsonParse<{ event_id?: string }>(entry.body);
			return body.event_id === eventId;
		},
	);
	if (!record) throw new Error(`Expected Slack webhook record ${eventId}`);
	return record;
}

function webhookBody(eventId: string) {
	return jsonParse<SlackReplayFixtures['mention']>(recordedWebhook(eventId).body);
}

function recordedSlackFixtures(overrides: Partial<SlackReplayFixtures> = {}): SlackReplayFixtures {
	const mention = overrides.mention ?? webhookBody('Ev_APP_MENTION');
	const followUp =
		overrides.followUp ??
		({
			...mention,
			event: {
				...mention.event,
				type: 'message',
				text: 'follow up',
				ts: '1782378391.000000',
				thread_ts: mention.event.ts,
			},
		} as SlackReplayFixtures['followUp']);

	return {
		botUserId: 'U_BOT',
		user: { id: 'U_USER', name: 'user', real_name: 'Recorded User' },
		channel: { id: 'C_CHANNEL', name: 'recorded-channel' },
		mention,
		followUp,
		selfMessage: overrides.selfMessage ?? webhookBody('Ev_BOT_CHANNEL_RESPONSE'),
		...overrides,
	};
}

describe('Slack recorded integration replay', () => {
	it('replays a recorded Slack app mention and outbound post', async () => {
		const fixtures = recordedSlackFixtures();

		const ctx = await createSlackReplayContext(fixtures, {
			stream: [
				{
					type: 'text-delta',
					id: 'recorded-slack-response',
					delta: 'Hey! 👋 How can I help you today?',
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'hey',
					integrationType: 'slack',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				platform: 'slack',
				messageId: '1782378390.841549',
				interactingUserId: 'U_USER',
				agentUserId: 'U_BOT',
				target: {
					threadId: 'slack:C_CHANNEL:1782378390.841549',
					channelId: 'slack:C_CHANNEL',
				},
			});
			expect(ctx.lastPost()?.body).toMatchObject({
				channel: 'C_CHANNEL',
				thread_ts: '1782378390.841549',
				markdown_text: 'Hey! 👋 How can I help you today?',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores duplicate recorded Slack bot-authored channel_join webhooks', async () => {
		const fixtures = recordedSlackFixtures({ mention: webhookBody('Ev_CHANNEL_JOIN') });
		const retry = recordedWebhook('Ev_CHANNEL_JOIN');
		const ctx = await createSlackReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);
			await ctx.sendWebhook(jsonParse<SlackReplayFixtures['mention']>(retry.body));

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		} finally {
			await ctx.shutdown();
		}
	});

	it('replays a recorded Slack DM message and outbound DM post', async () => {
		const fixtures = recordedSlackFixtures({
			mention: webhookBody('Ev_DM_MESSAGE'),
			selfMessage: webhookBody('Ev_BOT_DM_RESPONSE'),
		});
		const ctx = await createSlackReplayContext(fixtures, {
			stream: [
				{ type: 'text-delta', id: 'dm-response', delta: "I'm Assistant." },
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "DM message. What's your name?",
					integrationType: 'slack',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				platform: 'slack',
				messageId: '1782379185.654229',
				interactingUserId: 'U_USER',
				target: {
					threadId: 'slack:D_DM:',
					channelId: 'slack:D_DM',
				},
			});
			expect(ctx.lastPost()?.body).toMatchObject({
				channel: 'D_DM',
				markdown_text: "I'm Assistant.",
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores recorded Slack bot-authored response webhooks', async () => {
		const ctx = await createSlackReplayContext(recordedSlackFixtures());
		try {
			await ctx.sendWebhook(webhookBody('Ev_BOT_CHANNEL_RESPONSE'));
			await ctx.sendWebhook(webhookBody('Ev_BOT_DM_RESPONSE'));

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		} finally {
			await ctx.shutdown();
		}
	});
});
