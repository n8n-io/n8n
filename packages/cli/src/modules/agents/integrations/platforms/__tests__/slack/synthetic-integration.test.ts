import assert from 'node:assert/strict';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import { createSlackReplayContext } from '../../../__tests__/helpers/slack/replay-test-context';
import {
	slackEventCallback,
	slackReplayFixtures,
	slackUser,
} from '../../../__tests__/helpers/slack/synthetic-fixtures';
import { SlackIntegration } from '../../slack/slack-integration';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loaders to native dynamic imports so the real adapters are used.
vi.mock('../../../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
	loadTelegramAdapter: async () => await import('@chat-adapter/telegram'),
	loadSlackAdapter: async () => await import('@chat-adapter/slack'),
	loadLinearAdapter: async () => await import('@chat-adapter/linear'),
}));

describe('Slack channel integration scenarios', () => {
	it.each(['C_SUPPORT', 'G_PRIVATE'])(
		'replies to a top-level mention in %s and ignores an untagged session reset',
		async (channel) => {
			const fixtures = slackReplayFixtures({
				channel: { id: channel, name: 'support' },
				mention: slackEventCallback({ event: { channel, thread_ts: undefined } }),
			});
			const ctx = await createSlackReplayContext(fixtures, {
				settings: { messagingExperience: 'agent', onlyRespondWhenMentioned: true },
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
				const context = ctx.latestContext();
				const callsBeforeReset = ctx.apiCalls.length;

				await ctx.sendWebhook(
					slackEventCallback({
						event: { ...fixtures.followUp.event, text: '/new' },
					}),
				);

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
				expect(ctx.latestContext()).toEqual(context);
				expect(ctx.apiCalls).toHaveLength(callsBeforeReset);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it.each([undefined, false, true])(
		'keeps the thread subscribed and applies the mention-only setting: %s',
		async (onlyRespondWhenMentioned) => {
			const fixtures = slackReplayFixtures();
			const ctx = await createSlackReplayContext(fixtures, {
				settings: { messagingExperience: 'agent', onlyRespondWhenMentioned },
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
				const threadId = ctx.latestContext()?.target.threadId;
				assert(threadId, 'The Slack mention must create a thread.');
				expect(await ctx.chat.thread(threadId).isSubscribed()).toBe(true);

				const callsBeforeFollowUp = ctx.apiCalls.length;
				await ctx.sendWebhook(fixtures.followUp);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(
					onlyRespondWhenMentioned ? 1 : 2,
				);
				if (onlyRespondWhenMentioned) {
					expect(ctx.apiCalls).toHaveLength(callsBeforeFollowUp);
				}

				await ctx.sendWebhook(
					slackEventCallback({
						event: { ...fixtures.mention.event, ts: '1719000003.000400' },
					}),
				);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(
					onlyRespondWhenMentioned ? 2 : 3,
				);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it.each([undefined, false, true])(
		'applies the mention-only setting to subscribed group direct messages: %s',
		async (onlyRespondWhenMentioned) => {
			const fixtures = slackReplayFixtures({
				channel: { id: 'G_GROUP', name: 'group' },
				mention: slackEventCallback({
					event: { channel: 'G_GROUP', channel_type: 'mpim', thread_ts: undefined },
				}),
			});
			const ctx = await createSlackReplayContext(fixtures, {
				settings: { messagingExperience: 'agent', onlyRespondWhenMentioned },
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
				const threadId = ctx.latestContext()?.target.threadId;
				assert(threadId, 'The Slack mention must create a thread.');
				expect(await ctx.chat.thread(threadId).isSubscribed()).toBe(true);
				const callsBeforeFollowUp = ctx.apiCalls.length;

				await ctx.sendWebhook(
					slackEventCallback({
						event: { ...fixtures.followUp.event, channel_type: 'mpim' },
					}),
				);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(
					onlyRespondWhenMentioned ? 1 : 2,
				);
				if (onlyRespondWhenMentioned) {
					expect(ctx.apiCalls).toHaveLength(callsBeforeFollowUp);
				}

				await ctx.sendWebhook(
					slackEventCallback({
						event: {
							...fixtures.mention.event,
							thread_ts: fixtures.mention.event.ts,
							ts: '1719000003.000400',
						},
					}),
				);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(
					onlyRespondWhenMentioned ? 2 : 3,
				);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it('handles Slack URL verification without an active connection', () => {
		const integration = new SlackIntegration(mock<AgentRepository>());

		expect(
			integration.handleUnauthenticatedWebhook({
				agentId: 'agent-1',
				method: 'POST',
				query: {},
				headers: {},
				body: { type: 'url_verification', challenge: 'url-verification-challenge' },
			}),
		).toEqual({ status: 200, body: { challenge: 'url-verification-challenge' } });
	});

	it.each([undefined, true])(
		'replies to Slack DMs with mention-only set to %s',
		async (onlyRespondWhenMentioned) => {
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
			const ctx = await createSlackReplayContext(fixtures, {
				settings: { messagingExperience: 'agent', onlyRespondWhenMentioned },
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
					expect.objectContaining({
						message: "DM message. What's your name?",
						integrationType: 'slack',
						episodicScope: {
							writeScopeId: 'slack:agent-1:T_TEAM:dm:U_DM_USER',
							readScopeIds: ['slack:agent-1:T_TEAM:dm:U_DM_USER'],
						},
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
				await ctx.sendWebhook(
					slackEventCallback({
						event: {
							...fixtures.mention.event,
							text: 'Another direct message',
							ts: '1719000101.000200',
						},
					}),
				);
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it.each([
		{ channelType: 'channel', channelId: 'C_SUPPORT', kind: 'channel' },
		{ channelType: 'group', channelId: 'G_PRIVATE', kind: 'channel' },
		{ channelType: 'mpim', channelId: 'G_DM', kind: 'group' },
		{ channelType: undefined, channelId: 'C_SUPPORT', kind: 'channel' },
	])(
		'uses the receiving workspace for $channelType events',
		async ({ channelType, channelId, kind }) => {
			const fixtures = slackReplayFixtures();
			const ctx = await createSlackReplayContext(fixtures);
			try {
				const payload = {
					...fixtures.mention,
					team_id: 'T_RECEIVING',
					event: {
						...fixtures.mention.event,
						channel: channelId,
						channel_type: channelType,
						team: 'T_AUTHOR',
						team_id: 'T_INNER',
						n8nWorkspaceId: 'T_FORGED',
					},
				};
				await ctx.sendWebhook(payload);

				const scopeId = `slack:agent-1:T_RECEIVING:${kind}:${channelId}`;
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
					expect.objectContaining({
						episodicScope: { writeScopeId: scopeId, readScopeIds: [scopeId] },
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it.each([
		{ workspaceId: undefined, channelType: 'channel' },
		{ workspaceId: 'T_TEAM', channelType: 'unsupported' },
	])(
		'keeps chat available without resolved ownership: %j',
		async ({ workspaceId, channelType }) => {
			const fixtures = slackReplayFixtures();
			const ctx = await createSlackReplayContext(fixtures);
			try {
				await ctx.sendWebhook({
					...fixtures.mention,
					team_id: workspaceId,
					event: {
						...fixtures.mention.event,
						channel_type: channelType,
						n8nWorkspaceId: 'T_FORGED',
					},
				});

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
					expect.objectContaining({
						episodicScope: { disabled: true },
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it('rejects an invalid webhook signature before processing the event', async () => {
		const fixtures = slackReplayFixtures();
		const ctx = await createSlackReplayContext(fixtures);
		try {
			const response = await ctx.sendWebhook(
				fixtures.mention,
				new Headers({
					'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)),
					'x-slack-signature': `v0=${'0'.repeat(64)}`,
				}),
			);

			expect(response.status).toBe(401);
			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
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
