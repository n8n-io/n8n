import type { StreamChunk } from '@n8n/agents';
import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import type {
	TelegramReplayContext,
	TelegramReplayFixtures,
} from '../../../__tests__/helpers/telegram/replay-test-context';
import {
	callbackPayloadWithData,
	createTelegramReplayContext,
	getTelegramInlineCallbackData,
} from '../../../__tests__/helpers/telegram/replay-test-context';
import type { ChannelIntegrationRecord } from '../../../recording/channel-integration-recorder';

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

const telegramFixtures = jsonParse<TelegramReplayFixtures>(
	readFileSync(join(__dirname, '../../../__tests__/fixtures/telegram/basic.json'), 'utf8'),
);
const recordedSession = jsonParse<ChannelIntegrationRecord[]>(
	readFileSync(
		join(__dirname, '../../../__tests__/fixtures/telegram/recorded-session.json'),
		'utf8',
	),
);

const approvalCardText = [
	'Approval required',
	'The agent wants to run this tool: Send Telegram message',
	'Tool: Send Telegram message',
	'Input: {',
	'  "text": "Ship it?"',
	'}',
].join('\n');

function approvalSuspensionStream(): StreamChunk[] {
	return [
		{
			type: 'tool-call-suspended',
			runId: 'run-telegram-1',
			toolCallId: 'tool-approval-1',
			toolName: 'approval',
			suspendPayload: {
				type: 'approval',
				toolName: 'send_telegram_message',
				displayName: 'Send Telegram message',
				args: { text: 'Ship it?' },
			},
			resumeSchema: {
				type: 'object',
				properties: { approved: { type: 'boolean' } },
				required: ['approved'],
			},
		},
		{ type: 'finish', finishReason: 'stop' },
	];
}

async function clickTelegramCard(
	ctx: TelegramReplayContext,
	callbackData: string,
	messageText = approvalCardText,
): Promise<void> {
	ctx.nextStream([{ type: 'finish', finishReason: 'stop' }]);
	await ctx.sendTelegramWebhook(
		callbackPayloadWithData(telegramFixtures.callbackBase, callbackData, 1000, messageText),
	);
}

function getRecordedWebhook() {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'webhook' }> =>
			entry.type === 'webhook' && entry.platform === 'telegram',
	);
	if (!record) throw new Error('Expected Telegram webhook record');
	return record;
}

function getRecordedFetch(method: string) {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'fetch' }> =>
			entry.type === 'fetch' && entry.url.endsWith(`/${method}`),
	);
	if (!record?.responseBody) throw new Error(`Expected Telegram ${method} fetch record`);
	return record;
}

function recordedTelegramFixtures(): TelegramReplayFixtures {
	const getMe = jsonParse<{
		result: TelegramReplayFixtures['bot'];
	}>(getRecordedFetch('getMe').responseBody ?? '{}');
	const webhook = jsonParse<TelegramReplayFixtures['mention']>(getRecordedWebhook().body);
	const message = webhook.message;
	if (!message?.from) throw new Error('Expected recorded webhook message');

	return {
		bot: getMe.result,
		user: message.from,
		chat: message.chat,
		mention: webhook,
		followUp: {
			update_id: webhook.update_id + 1,
			message: {
				...message,
				message_id: message.message_id + 1,
				text: 'follow up',
			},
		},
		selfMessage: {
			update_id: webhook.update_id + 2,
			message: {
				...message,
				message_id: message.message_id + 2,
				from: getMe.result,
				text: 'bot echo',
			},
		},
		callbackBase: telegramFixtures.callbackBase,
	};
}

describe('Telegram recorded integration replay', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('replays the captured Telegram session without exposing reasoning', async () => {
		const fixtures = recordedTelegramFixtures();

		const ctx = await createTelegramReplayContext(fixtures, {
			stream: [
				{ type: 'reasoning-start', id: 'recorded-reasoning' },
				{ type: 'reasoning-delta', id: 'recorded-reasoning', delta: 'The ' },
				{ type: 'reasoning-delta', id: 'recorded-reasoning', delta: 'user is asking...' },
				{ type: 'reasoning-end', id: 'recorded-reasoning' },
				{ type: 'text-start', id: 'recorded-response' },
				{ type: 'text-delta', id: 'recorded-response', delta: 'Test response' },
				{ type: 'text-end', id: 'recorded-response' },
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendTelegramWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'hey',
					integrationType: 'telegram',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				platform: 'telegram',
				messageId: '123456789:178',
				interactingUserId: '123456789',
				target: {
					threadId: 'telegram:123456789',
					channelId: 'telegram:123456789',
				},
			});
			const sentMessages = ctx.apiCalls.filter((call) => call.method === 'sendMessage');
			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0]?.body).toMatchObject({
				chat_id: '123456789',
				text: 'Test response',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('routes allowed private-mode Telegram users and ignores blocked users during replay', async () => {
		const ctx = await createTelegramReplayContext(telegramFixtures, {
			integration: {
				type: 'telegram',
				credentialId: 'cred-telegram',
				settings: { accessMode: 'private', allowedUsers: ['alice_dev'] },
			},
		});
		try {
			await ctx.sendTelegramWebhook(telegramFixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
		} finally {
			await ctx.shutdown();
		}

		const originalMessage = telegramFixtures.mention.message;
		if (!originalMessage) throw new Error('Telegram mention fixture must include a message');
		const blockedPayload = {
			...telegramFixtures.mention,
			message: {
				...originalMessage,
				from: {
					id: 999999,
					is_bot: false,
					first_name: 'Mallory',
					username: 'mallory',
				},
			},
		};
		const blockedCtx = await createTelegramReplayContext(telegramFixtures, {
			integration: {
				type: 'telegram',
				credentialId: 'cred-telegram',
				settings: { accessMode: 'private', allowedUsers: ['alice_dev'] },
			},
		});
		try {
			await blockedCtx.sendTelegramWebhook(blockedPayload);

			expect(blockedCtx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		} finally {
			await blockedCtx.shutdown();
		}
	});

	it.each([
		{ buttonIndex: 0, approved: true, outcome: '✅ Approved by Alice' },
		{ buttonIndex: 1, approved: false, outcome: '🚫 Declined by Alice' },
	])(
		'automatically settles Telegram approval cards in place ($outcome)',
		async ({ buttonIndex, approved, outcome }) => {
			const ctx = await createTelegramReplayContext(telegramFixtures, {
				stream: approvalSuspensionStream(),
			});
			try {
				await ctx.sendTelegramWebhook(telegramFixtures.mention);

				const cardMessage = ctx.lastApiCall('sendMessage');
				const callbackData = getTelegramInlineCallbackData(cardMessage, buttonIndex);
				expect(callbackData).toBeDefined();
				expect(Buffer.byteLength(callbackData ?? '', 'utf8')).toBeLessThanOrEqual(64);
				const sendMessageCountBeforeCallback = ctx.apiCalls.filter(
					(call) => call.method === 'sendMessage',
				).length;

				await clickTelegramCard(ctx, callbackData ?? '');

				expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({
						runId: 'run-telegram-1',
						toolCallId: 'tool-approval-1',
						resumeData: { approved },
						integrationType: 'telegram',
					}),
				);
				expect(ctx.latestContext()).toMatchObject({
					platform: 'telegram',
					messageId: '123456:1000',
					target: { threadId: 'telegram:123456' },
				});

				expect(ctx.lastApiCall('deleteMessage')).toBeUndefined();
				expect(ctx.lastApiCall('answerCallbackQuery')?.body).toMatchObject({
					callback_query_id: 'callback-1',
				});
				expect(ctx.lastApiCall('editMessageText')?.body).toMatchObject({
					chat_id: '123456',
					message_id: 1000,
					text: `${approvalCardText}\n\n${outcome}`,
					reply_markup: { inline_keyboard: [] },
				});
				expect(ctx.apiCalls.filter((call) => call.method === 'sendMessage')).toHaveLength(
					sendMessageCountBeforeCallback,
				);
			} finally {
				await ctx.shutdown();
			}
		},
	);

	it('invalidates sibling Telegram approval callbacks after a decision', async () => {
		const ctx = await createTelegramReplayContext(telegramFixtures, {
			stream: approvalSuspensionStream(),
		});
		try {
			await ctx.sendTelegramWebhook(telegramFixtures.mention);

			const cardMessage = ctx.lastApiCall('sendMessage');
			const approveCallback = getTelegramInlineCallbackData(cardMessage, 0);
			const denyCallback = getTelegramInlineCallbackData(cardMessage, 1);
			expect(approveCallback).toBeDefined();
			expect(denyCallback).toBeDefined();

			await clickTelegramCard(ctx, approveCallback ?? '');
			await clickTelegramCard(ctx, denyCallback ?? '');

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledTimes(1);
		} finally {
			await ctx.shutdown();
		}
	});

	it('resumes Telegram approvals when settling the card fails', async () => {
		const ctx = await createTelegramReplayContext(telegramFixtures, {
			failedApiMethods: ['editMessageText'],
			stream: approvalSuspensionStream(),
		});
		try {
			await ctx.sendTelegramWebhook(telegramFixtures.mention);

			const cardMessage = ctx.lastApiCall('sendMessage');
			const callbackData = getTelegramInlineCallbackData(cardMessage);
			await clickTelegramCard(ctx, callbackData ?? '');

			expect(ctx.lastApiCall('editMessageText')).toBeDefined();
			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledTimes(1);
			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({ resumeData: { approved: true } }),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('settles non-approval Telegram cards and invalidates sibling callbacks', async () => {
		const ctx = await createTelegramReplayContext(telegramFixtures, {
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-telegram-1',
					toolCallId: 'tool-card-1',
					toolName: 'custom_card',
					suspendPayload: {
						title: 'Choose an action',
						components: [
							{ type: 'button', label: 'Continue', value: 'continue' },
							{ type: 'button', label: 'Cancel', value: 'cancel' },
						],
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendTelegramWebhook(telegramFixtures.mention);

			const cardMessage = ctx.lastApiCall('sendMessage');
			const continueCallback = getTelegramInlineCallbackData(cardMessage, 0);
			const cancelCallback = getTelegramInlineCallbackData(cardMessage, 1);
			await clickTelegramCard(ctx, continueCallback ?? '', 'Choose an action');
			await clickTelegramCard(ctx, cancelCallback ?? '', 'Choose an action');

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledTimes(1);
			expect(ctx.lastApiCall('editMessageText')?.body).toMatchObject({
				chat_id: '123456',
				message_id: 1000,
				text: 'Choose an action\n\n✅ Continue selected by Alice',
				reply_markup: { inline_keyboard: [] },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('sends Telegram direct messages through the integration action executor', async () => {
		const ctx = await createTelegramReplayContext(telegramFixtures);
		try {
			const result = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'send_dm',
				input: { userId: '123456', message: { text: 'DM from agent' } },
				awaitResponse: false,
			});

			expect(result).toMatchObject({
				ok: true,
				messageContext: {
					platform: 'telegram',
					target: { type: 'dm', userId: '123456', threadId: 'telegram:123456' },
				},
			});
			expect(ctx.lastApiCall('sendMessage')?.body).toMatchObject({
				chat_id: '123456',
				text: 'DM from agent',
			});
		} finally {
			await ctx.shutdown();
		}
	});
});
