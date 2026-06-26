import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { Logger } from 'n8n-workflow';

import type { UrlService } from '@/services/url.service';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import { AgentChatBridge } from '../../../agent-chat-bridge';
import { ChatIntegrationRegistry } from '../../../agent-chat-integration';
import type { ChatIntegrationService, ChatInstance } from '../../../chat-integration.service';
import type { ShortenCallback } from '../../../component-mapper';
import { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type { IntegrationMessageContextService } from '../../../integration-message-context.service';
import type { IntegrationMessageContext } from '../../../integration-tools';
import { getIntegrationToolConnectionDescriptors } from '../../../integration-tools';
import { TelegramIntegration } from '../../../platforms/telegram-integration';

type AgentExecutorLike = ConstructorParameters<typeof AgentChatBridge>[2];

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

interface TestAuthor {
	userId: string;
	userName: string;
	fullName: string;
	isBot: boolean | 'unknown';
	isMe: boolean;
}

interface TestMessage {
	id: string;
	threadId: string;
	text: string;
	raw: TelegramMessageFixture;
	author: TestAuthor;
	isMention: boolean;
	subject: Promise<null>;
}

interface TestActionEvent {
	adapter: TestTelegramAdapter;
	actionId: string;
	value?: string;
	messageId: string;
	threadId: string;
	thread: TestThread;
	user: TestAuthor;
	raw: TelegramCallbackQueryFixture;
}

interface TestCard {
	title?: string;
	buttons: Array<{ id: string; label: string; value: string }>;
}

interface TestPostableCard {
	card: TestCard;
}

type TestPostable = string | { markdown: string } | TestPostableCard;

export interface TelegramApiCall {
	method: string;
	body: Record<string, unknown>;
}

export interface TelegramReplayFixtures {
	mention: TelegramUpdateFixture;
	followUp: TelegramUpdateFixture;
	selfMessage: TelegramUpdateFixture;
	callbackBase: TelegramUpdateFixture;
	user: TelegramUserFixture;
	bot: TelegramUserFixture;
	chat: TelegramChatFixture;
}

export interface TelegramReplayContext {
	chat: ChatInstance;
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
	shutdown: () => Promise<void>;
}

export class MemoryMessageContextStore {
	private readonly contexts = new Map<string, IntegrationMessageContext>();

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		return await Promise.resolve(this.contexts.get(threadId) ?? null);
	}

	async setLatest(
		threadId: string,
		_resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void> {
		this.contexts.set(threadId, context);
		await Promise.resolve();
		return;
	}

	latest(): IntegrationMessageContext | undefined {
		return [...this.contexts.values()].at(-1);
	}

	latestThreadId(): string | undefined {
		return [...this.contexts.keys()].at(-1);
	}
}

class TestThread {
	readonly channelId: string;

	constructor(
		readonly id: string,
		readonly adapter: TestTelegramAdapter,
		private readonly chat: TestChat,
	) {
		this.channelId = adapter.channelIdFromThreadId(id);
	}

	async subscribe(): Promise<void> {
		this.chat.subscribe(this.id);
		return await Promise.resolve(undefined);
	}

	async post(message: TestPostable): Promise<{ id: string; threadId: string }> {
		return await this.adapter.postMessage(this.id, message);
	}

	async startTyping(): Promise<void> {
		return await this.adapter.startTyping(this.id);
	}
}

class TestChat {
	readonly webhooks: Record<
		string,
		(
			request: Request,
			options?: { waitUntil?: (task: Promise<unknown>) => void },
		) => Promise<Response>
	>;

	private readonly subscribedThreadIds = new Set<string>();

	private readonly mentionHandlers: Array<
		(thread: TestThread, message: TestMessage) => Promise<void>
	> = [];

	private readonly subscribedMessageHandlers: Array<
		(thread: TestThread, message: TestMessage) => Promise<void>
	> = [];

	private readonly actionHandlers: Array<(event: TestActionEvent) => Promise<void>> = [];

	constructor(readonly adapter: TestTelegramAdapter) {
		adapter.initialize(this);
		this.webhooks = {
			telegram: async (request, options) => await adapter.handleWebhook(request, options),
		};
	}

	onNewMention(handler: (thread: TestThread, message: TestMessage) => Promise<void>): void {
		this.mentionHandlers.push(handler);
	}

	onSubscribedMessage(handler: (thread: TestThread, message: TestMessage) => Promise<void>): void {
		this.subscribedMessageHandlers.push(handler);
	}

	onAction(handler: (event: TestActionEvent) => Promise<void>): void {
		this.actionHandlers.push(handler);
	}

	getAdapter(name: string): unknown {
		return name === 'telegram' ? this.adapter : undefined;
	}

	async openDM(userId: string): Promise<TestThread> {
		return await Promise.resolve(this.thread(`telegram:${userId}`));
	}

	thread(threadId: string): TestThread {
		return new TestThread(threadId, this.adapter, this);
	}

	channel(channelId: string): {
		post: (message: TestPostable) => Promise<{ id: string; threadId: string }>;
	} {
		return {
			post: async (message) => await this.adapter.postMessage(channelId, message),
		};
	}

	async getUser(userId: string) {
		return await Promise.resolve({
			userId,
			userName: userId,
			fullName: userId,
			isBot: false,
			email: undefined,
		});
	}

	async initialize(): Promise<void> {}

	async shutdown(): Promise<void> {}

	subscribe(threadId: string): void {
		this.subscribedThreadIds.add(threadId);
	}

	processMessage(
		_adapter: TestTelegramAdapter,
		threadId: string,
		message: TestMessage,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): void {
		const task = this.dispatchMessage(threadId, message);
		options?.waitUntil?.(task);
	}

	processAction(
		event: Omit<TestActionEvent, 'thread'>,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): void {
		const task = this.dispatchAction({ ...event, thread: this.thread(event.threadId) });
		options?.waitUntil?.(task);
	}

	private async dispatchMessage(threadId: string, message: TestMessage): Promise<void> {
		if (message.author.isMe) return;

		const thread = this.thread(threadId);
		if (this.subscribedThreadIds.has(threadId)) {
			await Promise.all(
				this.subscribedMessageHandlers.map(async (handler) => await handler(thread, message)),
			);
			return;
		}

		const isDm = this.adapter.isDM(threadId);
		if (message.isMention || isDm) {
			await Promise.all(
				this.mentionHandlers.map(async (handler) => await handler(thread, message)),
			);
		}
	}

	private async dispatchAction(event: TestActionEvent): Promise<void> {
		await Promise.all(this.actionHandlers.map(async (handler) => await handler(event)));
	}
}

// TODO: Remove this fake adapter after the jest → vitest migration. It only
// exists because the ESM-only `@chat-adapter/telegram` package cannot be loaded in
// jest's VM sandbox; vitest can load it natively, letting tests use the real adapter.
class TestTelegramAdapter {
	readonly name = 'telegram';

	readonly botUserId: string;

	constructor(
		readonly bot: TelegramUserFixture,
		private readonly secretToken: string,
		private readonly apiCalls: TelegramApiCall[],
	) {
		this.botUserId = String(bot.id);
	}

	initialize(_chat: TestChat): void {}

	async handleWebhook(
		request: Request,
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
			const message = this.parseMessage(update.message, threadId);
			this.chat?.processMessage(this, threadId, message, options);
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
			this.chat?.processAction(
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
			const ackTask = this.answerCallbackQuery(callbackQuery.id);
			options?.waitUntil?.(ackTask);
		}

		return new Response('OK', { status: 200 });
	}

	private chat: TestChat | undefined;

	attach(chat: TestChat): void {
		this.chat = chat;
	}

	async postMessage(
		threadId: string,
		message: TestPostable,
	): Promise<{ id: string; threadId: string }> {
		await Promise.resolve();
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
		return;
	}

	async startTyping(threadId: string): Promise<void> {
		this.apiCalls.push({
			method: 'sendChatAction',
			body: { chat_id: this.chatIdFromThreadId(threadId), action: 'typing' },
		});
		await Promise.resolve();
		return;
	}

	channelIdFromThreadId(threadId: string): string {
		return `telegram:${this.chatIdFromThreadId(threadId)}`;
	}

	isDM(threadId: string): boolean {
		return !this.chatIdFromThreadId(threadId).startsWith('-');
	}

	private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
		this.apiCalls.push({
			method: 'answerCallbackQuery',
			body: { callback_query_id: callbackQueryId },
		});
		await Promise.resolve();
		return;
	}

	private parseMessage(message: TelegramMessageFixture, threadId: string): TestMessage {
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

	private toAuthor(user: TelegramUserFixture): TestAuthor {
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

function toStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* stream() {
		await Promise.resolve();
		for (const chunk of chunks) yield chunk;
	})();
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
	const chat = new TestChat(adapter);
	adapter.attach(chat);

	const registry = new ChatIntegrationRegistry();
	registry.register(createIntegration());
	Container.set(ChatIntegrationRegistry, registry);

	let stream = options.stream ?? [
		{ type: 'text-delta', id: 'text-1', delta: 'Got it' },
		{ type: 'finish', finishReason: 'stop' },
	];
	const agentExecutor = {
		executeForChatPublished: jest.fn(() => toStream(stream)),
		resumeForChat: jest.fn(() => toStream(stream)),
	};
	const messageContextStore = new MemoryMessageContextStore();
	const integration = options.integration ?? {
		type: 'telegram',
		credentialId: 'cred-telegram',
		settings: { accessMode: 'public', allowedUsers: [] },
	};

	new AgentChatBridge(
		chat as never,
		'agent-1',
		agentExecutor as AgentExecutorLike,
		new TestComponentMapper() as never,
		mock<Logger>(),
		'project-1',
		integration,
		messageContextStore as unknown as IntegrationMessageContextService,
	);

	const chatIntegrationService = mock<ChatIntegrationService>();
	chatIntegrationService.getChatInstance.mockReturnValue(chat as never);
	const actionExecutor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
	const descriptor = getIntegrationToolConnectionDescriptors([integration], 'agent-1')[0];

	const sendTelegramWebhook = async (payload: unknown) => {
		const tasks: Array<Promise<unknown>> = [];
		const headers = new Headers();
		headers.set('content-type', 'application/json');
		headers.set('x-telegram-bot-api-secret-token', 'test-secret-token');
		const response = await chat.webhooks.telegram(
			new Request(
				'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/telegram',
				{
					method: 'POST',
					headers,
					body: JSON.stringify(payload),
				},
			),
			{ waitUntil: (task) => tasks.push(task) },
		);
		await Promise.all(tasks);
		return response;
	};

	return {
		chat: chat as never,
		adapter,
		agentExecutor,
		actionExecutor,
		apiCalls,
		descriptor,
		integration,
		messageContextStore,
		sendTelegramWebhook,
		sendWebhook: sendTelegramWebhook,
		latestContext: () => messageContextStore.latest(),
		latestThreadId: () => messageContextStore.latestThreadId(),
		lastApiCall: (method: string) => apiCalls.filter((call) => call.method === method).at(-1),
		lastPost: () => apiCalls.filter((call) => call.method === 'sendMessage').at(-1),
		nextStream: (chunks: StreamChunk[]) => {
			stream = chunks;
		},
		shutdown: async () => {
			await chat.shutdown();
			Container.reset();
		},
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
