import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { UrlService } from '@/services/url.service';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import type { ShortenCallback } from '../../../component-mapper';
import type { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { TelegramIntegration } from '../../../platforms/telegram-integration';
import {
	createReplayContextSetup,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayAuthor,
	ReplayChat,
	type ReplayContextSetup,
	type ReplayMessage,
	type ReplayPlatformAdapter,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface TelegramUserFixture {
	id: number;
	first_name: string;
	is_bot: boolean;
	username?: string;
	last_name?: string;
	language_code?: string;
}

export interface TelegramChatFixture {
	id: number;
	type: 'private' | 'group' | 'supergroup' | 'channel';
	first_name?: string;
	last_name?: string;
	username?: string;
	title?: string;
}

export interface TelegramMessageFixture {
	message_id: number;
	from?: TelegramUserFixture;
	chat: TelegramChatFixture;
	date: number;
	text?: string;
	message_thread_id?: number;
}

export interface TelegramCallbackQueryFixture {
	id: string;
	from: TelegramUserFixture;
	message?: TelegramMessageFixture;
	data?: string;
	chat_instance?: string;
}

export interface TelegramUpdateFixture {
	update_id: number;
	message?: TelegramMessageFixture;
	callback_query?: TelegramCallbackQueryFixture;
}

interface TestCard {
	title?: string;
	buttons: Array<{ id: string; label: string; value: string }>;
}

interface TestPostableCard {
	card: TestCard;
}

type TelegramPostable = string | { markdown: string } | TestPostableCard;

type TelegramMessage = ReplayMessage<TelegramMessageFixture, null>;

interface TelegramActionEvent {
	adapter: TestTelegramAdapter;
	actionId: string;
	value?: string;
	messageId: string;
	threadId: string;
	user: ReplayAuthor;
	raw: TelegramCallbackQueryFixture;
}

export type TelegramApiCall = ReplayApiCall;

export interface TelegramReplayFixtures {
	mention: TelegramUpdateFixture;
	followUp: TelegramUpdateFixture;
	selfMessage: TelegramUpdateFixture;
	callbackBase: TelegramUpdateFixture;
	user: TelegramUserFixture;
	bot: TelegramUserFixture;
	chat: TelegramChatFixture;
}

export interface TelegramReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ReplayChat<TelegramPostable, TelegramMessage, TelegramActionEvent>;
	adapter: TestTelegramAdapter;
	agentExecutor: {
		executeForChatPublished: jest.Mock;
		resumeForChat: jest.Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	apiCalls: TelegramApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendTelegramWebhook: (payload: unknown) => Promise<Response>;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastApiCall: (method: string) => TelegramApiCall | undefined;
	lastPost: () => TelegramApiCall | undefined;
	nextStream: (chunks: StreamChunk[]) => void;
}

// TODO: Remove this fake adapter after the jest -> vitest migration. It only
// exists because the ESM-only `@chat-adapter/telegram` package cannot be loaded in
// jest's VM sandbox; vitest can load it natively, letting tests use the real adapter.
export class TestTelegramAdapter
	implements ReplayPlatformAdapter<TelegramPostable, TelegramMessage, TelegramActionEvent>
{
	readonly name = 'telegram';

	readonly botUserId: string;

	constructor(
		readonly bot: TelegramUserFixture,
		private readonly secretToken: string,
		private readonly apiCalls: TelegramApiCall[],
	) {
		this.botUserId = String(bot.id);
	}

	async handleWebhook(
		request: Request,
		chat: ReplayChat<TelegramPostable, TelegramMessage, TelegramActionEvent>,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): Promise<Response> {
		if (request.headers.get('x-telegram-bot-api-secret-token') !== this.secretToken) {
			return new Response('Invalid secret token', { status: 401 });
		}

		const update = (await request.json()) as TelegramUpdateFixture;
		if (update.message) {
			const threadId = this.encodeThreadId(
				update.message.chat.id,
				update.message.message_thread_id,
			);
			chat.processMessage(threadId, this.parseMessage(update.message, threadId), options);
		}
		if (update.callback_query) {
			const callbackQuery = update.callback_query;
			if (!callbackQuery.message) return new Response('OK', { status: 200 });
			const callbackMessage = callbackQuery.message;
			const threadId = this.encodeThreadId(
				callbackMessage.chat.id,
				callbackMessage.message_thread_id,
			);
			const { actionId, value } = decodeCallbackData(callbackQuery.data);
			chat.processAction(
				{
					adapter: this,
					actionId,
					value,
					messageId: this.encodeMessageId(callbackMessage.chat.id, callbackMessage.message_id),
					threadId,
					user: this.toAuthor(callbackQuery.from),
					raw: callbackQuery,
				},
				options,
			);
			options?.waitUntil?.(this.answerCallbackQuery(callbackQuery.id));
		}

		return new Response('OK', { status: 200 });
	}

	async postMessage(
		threadId: string,
		message: TelegramPostable,
	): Promise<{ id: string; threadId: string }> {
		const chatId = this.chatIdFromThreadId(threadId);
		const body: Record<string, unknown> = { chat_id: chatId };
		const messageThreadId = this.messageThreadIdFromThreadId(threadId);
		if (messageThreadId !== undefined) body.message_thread_id = messageThreadId;
		if (typeof message === 'string') {
			body.text = message;
		} else if ('markdown' in message) {
			body.text = message.markdown;
		} else {
			body.text = message.card.title ?? 'Card';
			body.reply_markup = JSON.stringify({
				inline_keyboard: [
					message.card.buttons.map((button) => ({
						text: button.label,
						callback_data: encodeCallbackData(button.id, button.value),
					})),
				],
			});
		}
		this.apiCalls.push({ method: 'sendMessage', body });
		await Promise.resolve();
		return { id: `${chatId}:1000`, threadId };
	}

	async deleteMessage(threadId: string, messageId: string): Promise<void> {
		const chatId = this.chatIdFromThreadId(threadId);
		const [, rawMessageId] = messageId.split(':');
		this.apiCalls.push({
			method: 'deleteMessage',
			body: { chat_id: chatId, message_id: Number(rawMessageId ?? messageId) },
		});
		await Promise.resolve();
	}

	async startTyping(threadId: string): Promise<void> {
		this.apiCalls.push({
			method: 'sendChatAction',
			body: { chat_id: this.chatIdFromThreadId(threadId), action: 'typing' },
		});
		await Promise.resolve();
	}

	channelIdFromThreadId(threadId: string): string {
		return `telegram:${this.chatIdFromThreadId(threadId)}`;
	}

	openDMThreadId(userId: string): string {
		return `telegram:${userId}`;
	}

	async getUser(userId: string): Promise<ReplayAuthor> {
		return await Promise.resolve({
			userId,
			userName: userId,
			fullName: userId,
			isBot: false,
			isMe: false,
		});
	}

	shouldDispatchAsMention(threadId: string, message: TelegramMessage): boolean {
		return message.isMention || this.isDM(threadId);
	}

	private isDM(threadId: string): boolean {
		return !this.chatIdFromThreadId(threadId).startsWith('-');
	}

	private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
		this.apiCalls.push({
			method: 'answerCallbackQuery',
			body: { callback_query_id: callbackQueryId },
		});
		await Promise.resolve();
	}

	private parseMessage(message: TelegramMessageFixture, threadId: string): TelegramMessage {
		return {
			id: this.encodeMessageId(message.chat.id, message.message_id),
			threadId,
			text: message.text ?? '',
			raw: message,
			author: message.from ? this.toAuthor(message.from) : this.toAuthor(this.bot),
			isMention: this.isDM(threadId) || Boolean(message.text?.includes(`@${this.bot.username}`)),
			subject: Promise.resolve(null),
		};
	}

	private toAuthor(user: TelegramUserFixture): ReplayAuthor {
		const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
		return {
			userId: String(user.id),
			userName: user.username ?? user.first_name,
			fullName: fullName !== '' ? fullName : (user.username ?? String(user.id)),
			isBot: user.is_bot,
			isMe: user.id === this.bot.id,
		};
	}

	private encodeThreadId(chatId: number | string, messageThreadId?: number): string {
		return messageThreadId === undefined
			? `telegram:${chatId}`
			: `telegram:${chatId}:${messageThreadId}`;
	}

	private encodeMessageId(chatId: number | string, messageId: number): string {
		return `${chatId}:${messageId}`;
	}

	private chatIdFromThreadId(threadId: string): string {
		return threadId.startsWith('telegram:') ? (threadId.split(':')[1] ?? threadId) : threadId;
	}

	private messageThreadIdFromThreadId(threadId: string): number | undefined {
		const raw = threadId.split(':')[2];
		if (!raw) return undefined;
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
}

class TestComponentMapper {
	async toCard(
		payload: {
			title?: string;
			components: Array<{ type: string; label?: string; value?: string }>;
		},
		runId: string,
		toolCallId: string,
		_resumeSchema?: unknown,
		shortenCallback?: ShortenCallback,
	): Promise<TestCard> {
		const buttons: TestCard['buttons'] = [];
		let index = 0;
		for (const component of payload.components) {
			if (component.type !== 'button') continue;
			const rawId = `resume:${runId}:${toolCallId}:${index++}`;
			const rawValue = JSON.stringify({ value: component.value ?? '' });
			const shortened = shortenCallback
				? await shortenCallback(rawId, rawValue)
				: { id: rawId, value: rawValue };
			buttons.push({
				id: shortened.id,
				label: component.label ?? 'Action',
				value: shortened.value,
			});
		}
		return { title: payload.title, buttons };
	}
}

function decodeCallbackData(data: string | undefined): {
	actionId: string;
	value: string | undefined;
} {
	if (!data?.startsWith('chat:')) return { actionId: data ?? 'telegram_callback', value: data };
	try {
		const parsed = JSON.parse(data.slice('chat:'.length)) as { a?: unknown; v?: unknown };
		return {
			actionId: typeof parsed.a === 'string' ? parsed.a : data,
			value: typeof parsed.v === 'string' ? parsed.v : undefined,
		};
	} catch {
		return { actionId: data, value: data };
	}
}

function encodeCallbackData(actionId: string, value: string): string {
	return `chat:${JSON.stringify({ a: actionId, v: value })}`;
}

function createIntegration() {
	const urlService = mock<UrlService>();
	urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

	return new TelegramIntegration(
		mock<BackendLogger>(),
		urlService,
		mock<AgentRepository>(),
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
		mock<OutboundHttp>(),
		{ enabled: false } as SsrfProtectionConfig,
		mock<SsrfProtectionService>(),
	);
}

export function callbackPayloadWithData(
	payload: TelegramUpdateFixture,
	data: string,
	messageId: number,
): TelegramUpdateFixture {
	return {
		...payload,
		callback_query: payload.callback_query
			? {
					...payload.callback_query,
					data,
					message: payload.callback_query.message
						? { ...payload.callback_query.message, message_id: messageId }
						: undefined,
				}
			: undefined,
	};
}

export async function createTelegramReplayContext(
	fixtures: TelegramReplayFixtures,
	options: {
		stream?: StreamChunk[];
		integration?: AgentIntegrationConfig;
	} = {},
): Promise<TelegramReplayContext> {
	await Promise.resolve();
	const apiCalls: TelegramApiCall[] = [];
	const adapter = new TestTelegramAdapter(fixtures.bot, 'test-secret-token', apiCalls);
	const chat = new ReplayChat(adapter);
	const integration = options.integration ?? {
		type: 'telegram',
		credentialId: 'cred-telegram',
		settings: { accessMode: 'public', allowedUsers: [] },
	};
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: createIntegration(),
		integration,
		componentMapper: new TestComponentMapper() as never,
		stream: options.stream,
	});

	const sendTelegramWebhook = async (payload: unknown) => {
		const headers = new Headers();
		headers.set('x-telegram-bot-api-secret-token', 'test-secret-token');
		return await sendJsonWebhook(
			chat.webhooks.telegram,
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/telegram',
			payload,
			headers,
		);
	};

	return {
		...setup,
		chat,
		adapter,
		apiCalls,
		sendTelegramWebhook,
		sendWebhook: sendTelegramWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastApiCall: (method: string) => apiCalls.filter((call) => call.method === method).at(-1),
		lastPost: () => apiCalls.filter((call) => call.method === 'sendMessage').at(-1),
	};
}

export function getTelegramInlineCallbackData(
	call: TelegramApiCall | undefined,
): string | undefined {
	const replyMarkup = call?.body.reply_markup;
	if (typeof replyMarkup !== 'string') return undefined;
	try {
		const parsed = JSON.parse(replyMarkup) as {
			inline_keyboard?: Array<Array<{ callback_data?: string }>>;
		};
		return parsed.inline_keyboard?.[0]?.[0]?.callback_data;
	} catch {
		return undefined;
	}
}
