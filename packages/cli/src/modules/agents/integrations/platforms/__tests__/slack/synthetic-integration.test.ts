import { createSlackReplayContext } from '../../../__tests__/helpers/slack/replay-test-context';
import {
	slackEventCallback,
	slackReplayFixtures,
	slackUser,
} from '../../../__tests__/helpers/slack/synthetic-fixtures';
import { SlackIntegration } from '../../slack-integration';

describe('Slack channel integration scenarios', () => {
	it('handles Slack URL verification without an active connection', () => {
		const integration = new SlackIntegration();

		expect(
			integration.handleUnauthenticatedWebhook({
				type: 'url_verification',
				challenge: 'url-verification-challenge',
			}),
		).toEqual({ status: 200, body: { challenge: 'url-verification-challenge' } });
	});

	it('routes a Slack DM message as a new agent conversation', async () => {
		const user = slackUser({ id: 'U_DM_USER', name: 'dm_user', real_name: 'DM User' });
		const fixtures = slackReplayFixtures({
			user,
			mention: slackEventCallback({
				event: {
					type: 'message',
					user: user.id,
					text: "DM message. What's your name?",
					ts: '1719000100.000100',
					channel: 'D_DM',
					channel_type: 'im',
					thread_ts: undefined,
				},
			}),
		});
		const ctx = await createSlackReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "DM message. What's your name?",
					integrationType: 'slack',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				messageId: '1719000100.000100',
				interactingUserId: 'U_DM_USER',
				target: {
					threadId: 'slack:D_DM:',
					channelId: 'slack:D_DM',
				},
			});
			expect(ctx.lastPost()?.body).toMatchObject({
				channel: 'D_DM',
				markdown_text: 'Got it',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores a Slack bot-authored channel_join message', async () => {
		const fixtures = slackReplayFixtures({
			mention: slackEventCallback({
				event: {
					type: 'message',
					subtype: 'channel_join',
					user: 'U_BOT',
					bot_id: 'B_BOT',
					text: '<@U_BOT> has joined the channel',
					ts: '1719000200.000100',
					channel: 'C_SUPPORT',
					channel_type: 'channel',
				},
			}),
		});
		const ctx = await createSlackReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			expect(ctx.latestContext()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores a Slack bot-authored message in a thread', async () => {
		const fixtures = slackReplayFixtures({
			mention: slackEventCallback({
				event: {
					type: 'message',
					user: 'U_BOT',
					bot_id: 'B_BOT',
					text: 'bot echo',
					ts: '1719000300.000100',
					thread_ts: '1719000000.000100',
					channel: 'C_SUPPORT',
					channel_type: 'channel',
				},
			}),
		});
		const ctx = await createSlackReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			expect(ctx.latestContext()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});
});
