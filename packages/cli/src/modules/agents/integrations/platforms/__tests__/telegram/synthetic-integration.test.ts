import {
	createTelegramReplayContext,
	getTelegramInlineCallbackData,
} from '../../../__tests__/helpers/telegram/replay-test-context';
import {
	telegramCallbackQueryUpdate,
	telegramGroupChat,
	telegramMessageUpdate,
	telegramReplayFixtures,
	telegramUser,
} from '../../../__tests__/helpers/telegram/synthetic-fixtures';

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

describe('Telegram Bot API integration scenarios', () => {
	it('routes a Telegram group mention to a new agent conversation', async () => {
		const group = telegramGroupChat();
		const user = telegramUser({ id: 234567, username: 'group_user' });
		const fixtures = telegramReplayFixtures({
			user,
			chat: group,
			mention: telegramMessageUpdate({
				message: {
					message_id: 21,
					from: user,
					chat: group,
					text: '@n8n_agent_bot hello group',
				},
			}),
		});
		const ctx = await createTelegramReplayContext(fixtures);
		try {
			await ctx.sendTelegramWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '@n8n_agent_bot hello group',
					integrationType: 'telegram',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				messageId: '-1001234567890:21',
				interactingUserId: '234567',
				target: {
					threadId: 'telegram:-1001234567890',
					channelId: 'telegram:-1001234567890',
				},
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores a Bot API group message that does not mention the bot', async () => {
		const group = telegramGroupChat();
		const fixtures = telegramReplayFixtures({
			chat: group,
			mention: telegramMessageUpdate({
				message: {
					message_id: 22,
					chat: group,
					text: 'hello everyone',
				},
			}),
		});
		const ctx = await createTelegramReplayContext(fixtures);
		try {
			await ctx.sendTelegramWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			expect(ctx.latestContext()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});

	it('preserves Telegram forum topic IDs in thread context and outbound responses', async () => {
		const group = telegramGroupChat();
		const fixtures = telegramReplayFixtures({
			chat: group,
			mention: telegramMessageUpdate({
				message: {
					message_id: 23,
					chat: group,
					message_thread_id: 42,
					text: '@n8n_agent_bot topic question',
				},
			}),
		});
		const ctx = await createTelegramReplayContext(fixtures);
		try {
			await ctx.sendTelegramWebhook(fixtures.mention);

			expect(ctx.latestContext()).toMatchObject({
				messageId: '-1001234567890:23',
				target: {
					threadId: 'telegram:-1001234567890:42',
					channelId: 'telegram:-1001234567890',
				},
			});
			expect(ctx.lastApiCall('sendMessage')?.body).toMatchObject({
				chat_id: '-1001234567890',
				message_thread_id: 42,
				text: 'Got it',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('resumes a suspended Telegram approval from an inline keyboard callback', async () => {
		const fixtures = telegramReplayFixtures();
		const ctx = await createTelegramReplayContext(fixtures, {
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-callback-1',
					toolCallId: 'tool-callback-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_telegram_message',
						displayName: 'Send Telegram message',
						args: { text: 'Continue?' },
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendTelegramWebhook(fixtures.mention);
			const callbackData = getTelegramInlineCallbackData(ctx.lastApiCall('sendMessage'));
			if (!callbackData) throw new Error('Expected inline keyboard markup');

			ctx.nextStream([
				{ type: 'text-delta', id: 'resume-text', delta: 'Callback handled' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			await ctx.sendTelegramWebhook(
				telegramCallbackQueryUpdate({
					data: callbackData,
					message: fixtures.callbackBase.callback_query?.message,
				}),
			);

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-callback-1',
					toolCallId: 'tool-callback-1',
					resumeData: { value: 'true' },
					integrationType: 'telegram',
				}),
			);
			expect(ctx.lastApiCall('answerCallbackQuery')?.body).toMatchObject({
				callback_query_id: 'callback-1',
			});
		} finally {
			await ctx.shutdown();
		}
	});
});
