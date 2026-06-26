import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { AgentChatBridge } from '../../agent-chat-bridge';
import { ChatIntegrationRegistry, type AgentChatIntegration } from '../../agent-chat-integration';
import type { ChatIntegrationService, ChatInstance } from '../../chat-integration.service';
import type { ComponentMapper } from '../../component-mapper';
import { ChatIntegrationActionExecutor } from '../../integration-action-executor';
import type { IntegrationMessageContextService } from '../../integration-message-context.service';
import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
} from '../../integration-tools';
import { getIntegrationToolConnectionDescriptors } from '../../integration-tools';

type AgentExecutorLike = ConstructorParameters<typeof AgentChatBridge>[2];

export interface ReplayAuthor {
	userId: string;
	userName: string;
	fullName: string;
	isBot: boolean | 'unknown';
	isMe: boolean;
	email?: string;
}

export interface ReplayMessage<Raw = unknown, Subject = unknown> {
	id: string;
	threadId: string;
	text: string;
	raw: Raw;
	author: ReplayAuthor;
	isMention: boolean;
	subject: Promise<Subject>;
}

export interface ReplayActionEvent {
	threadId: string;
	user: ReplayAuthor;
}

export type ReplayWebhookOptions = { waitUntil?: (task: Promise<unknown>) => void };

export type ReplayWebhookHandler = (
	request: Request,
	options?: ReplayWebhookOptions,
) => Promise<Response>;

export type ReplayPostable =
	| string
	| { markdown: string }
	| { card: unknown }
	| AsyncIterable<string>;

export interface ReplayApiCall {
	method: string;
	body: Record<string, unknown>;
}

export interface ReplaySentMessage {
	id: string;
	threadId: string;
}

export interface ReplayPlatformAdapter<
	TPostable = ReplayPostable,
	TMessage extends ReplayMessage = ReplayMessage,
	TAction extends ReplayActionEvent = ReplayActionEvent,
> {
	name: string;
	handleWebhook(
		request: Request,
		chat: ReplayChat<TPostable, TMessage, TAction>,
		options?: ReplayWebhookOptions,
	): Promise<Response>;
	postMessage(threadId: string, message: TPostable): Promise<ReplaySentMessage>;
	postChannelMessage?(channelId: string, message: TPostable): Promise<ReplaySentMessage>;
	startTyping?(threadId: string): Promise<void>;
	channelIdFromThreadId(threadId: string): string;
	openDMThreadId?(userId: string): string | Promise<string>;
	getUser?(userId: string): Promise<ReplayAuthor & { email?: string }>;
	shouldDispatchAsMention(threadId: string, message: TMessage): boolean;
}

export class ReplayThread<TPostable = ReplayPostable> {
	readonly channelId: string;

	constructor(
		readonly id: string,
		private readonly adapter: ReplayPlatformAdapter<TPostable>,
		private readonly chat: ReplayChat<TPostable>,
	) {
		this.channelId = adapter.channelIdFromThreadId(id);
	}

	async subscribe(): Promise<void> {
		this.chat.subscribe(this.id);
		await Promise.resolve();
	}

	async post(message: TPostable): Promise<ReplaySentMessage> {
		return await this.adapter.postMessage(this.id, message);
	}

	async startTyping(): Promise<void> {
		await this.adapter.startTyping?.(this.id);
	}
}

export class ReplayChat<
	TPostable = ReplayPostable,
	TMessage extends ReplayMessage = ReplayMessage,
	TAction extends ReplayActionEvent = ReplayActionEvent,
> {
	readonly webhooks: Record<string, ReplayWebhookHandler>;

	private readonly subscribedThreadIds = new Set<string>();

	private readonly mentionHandlers: Array<
		(thread: ReplayThread<TPostable>, message: TMessage) => Promise<void>
	> = [];

	private readonly subscribedHandlers: Array<
		(thread: ReplayThread<TPostable>, message: TMessage) => Promise<void>
	> = [];

	private readonly actionHandlers: Array<
		(event: TAction & { thread: ReplayThread<TPostable> }) => Promise<void>
	> = [];

	constructor(readonly adapter: ReplayPlatformAdapter<TPostable, TMessage, TAction>) {
		this.webhooks = {
			[adapter.name]: async (request, options) =>
				await adapter.handleWebhook(request, this, options),
		};
	}

	onNewMention(
		handler: (thread: ReplayThread<TPostable>, message: TMessage) => Promise<void>,
	): void {
		this.mentionHandlers.push(handler);
	}

	onSubscribedMessage(
		handler: (thread: ReplayThread<TPostable>, message: TMessage) => Promise<void>,
	): void {
		this.subscribedHandlers.push(handler);
	}

	onAction(handler: (event: TAction & { thread: ReplayThread<TPostable> }) => Promise<void>): void {
		this.actionHandlers.push(handler);
	}

	getAdapter(name: string): unknown {
		return name === this.adapter.name ? this.adapter : undefined;
	}

	thread(threadId: string): ReplayThread<TPostable> {
		return new ReplayThread(threadId, this.adapter, this);
	}

	channel(channelId: string): {
		post: (message: TPostable) => Promise<ReplaySentMessage>;
	} {
		return {
			post: async (message) =>
				await (this.adapter.postChannelMessage?.(channelId, message) ??
					this.adapter.postMessage(channelId, message)),
		};
	}

	async openDM(userId: string): Promise<ReplayThread<TPostable>> {
		const threadId = await Promise.resolve(
			this.adapter.openDMThreadId?.(userId) ?? `${this.adapter.name}:${userId}`,
		);
		return this.thread(threadId);
	}

	async getUser(userId: string): Promise<ReplayAuthor & { email?: string }> {
		return await Promise.resolve(
			this.adapter.getUser?.(userId) ?? {
				userId,
				userName: userId,
				fullName: userId,
				isBot: false,
				isMe: false,
				email: undefined,
			},
		);
	}

	async initialize(): Promise<void> {}

	async shutdown(): Promise<void> {}

	subscribe(threadId: string): void {
		this.subscribedThreadIds.add(threadId);
	}

	processMessage(
		threadId: string,
		message: TMessage,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): void {
		const task = this.dispatchMessage(threadId, message);
		options?.waitUntil?.(task);
	}

	processAction(event: TAction, options?: { waitUntil?: (task: Promise<unknown>) => void }): void {
		const task = this.dispatchAction({ ...event, thread: this.thread(event.threadId) });
		options?.waitUntil?.(task);
	}

	private async dispatchMessage(threadId: string, message: TMessage): Promise<void> {
		if (message.author.isMe) return;

		const thread = this.thread(threadId);
		if (this.subscribedThreadIds.has(threadId)) {
			await Promise.all(
				this.subscribedHandlers.map(async (handler) => await handler(thread, message)),
			);
			return;
		}

		if (this.adapter.shouldDispatchAsMention(threadId, message)) {
			await Promise.all(
				this.mentionHandlers.map(async (handler) => await handler(thread, message)),
			);
		}
	}

	private async dispatchAction(
		event: TAction & { thread: ReplayThread<TPostable> },
	): Promise<void> {
		await Promise.all(this.actionHandlers.map(async (handler) => await handler(event)));
	}
}

export class MemoryMessageContextStore implements IntegrationMessageContextStore {
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

export function toStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* stream() {
		await Promise.resolve();
		for (const chunk of chunks) yield chunk;
	})();
}

export async function postableToText(message: ReplayPostable): Promise<string> {
	if (typeof message === 'string') return message;
	if (isAsyncIterable(message)) {
		let text = '';
		for await (const chunk of message) text += chunk;
		return text;
	}
	if ('markdown' in message) return message.markdown;
	return '';
}

function isAsyncIterable(value: unknown): value is AsyncIterable<string> {
	return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

export async function sendJsonWebhook(
	handler: (
		request: Request,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	) => Promise<Response>,
	url: string,
	payload: unknown,
	headers: Headers = new Headers(),
): Promise<Response> {
	const tasks: Array<Promise<unknown>> = [];
	headers.set('content-type', 'application/json');
	const response = await handler(
		new Request(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		}),
		{ waitUntil: (task) => tasks.push(task) },
	);
	await Promise.all(tasks);
	return response;
}

export interface ReplayContextSetup<TChat extends ChatInstance = ChatInstance> {
	chat: TChat;
	agentExecutor: {
		executeForChatPublished: jest.Mock;
		resumeForChat: jest.Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	nextStream: (chunks: StreamChunk[]) => void;
	shutdown: () => Promise<void>;
}

export function createReplayContextSetup<TChat extends ChatInstance>(params: {
	chat: TChat;
	integrationImpl: AgentChatIntegration;
	integration: AgentIntegrationConfig;
	componentMapper?: ComponentMapper;
	stream?: StreamChunk[];
}): ReplayContextSetup<TChat> {
	const registry = new ChatIntegrationRegistry();
	registry.register(params.integrationImpl);
	Container.set(ChatIntegrationRegistry, registry);

	let stream = params.stream ?? [
		{ type: 'text-delta', id: 'text-1', delta: 'Got it' },
		{ type: 'finish', finishReason: 'stop' },
	];
	const agentExecutor = {
		executeForChatPublished: jest.fn(() => toStream(stream)),
		resumeForChat: jest.fn(() => toStream(stream)),
	};
	const messageContextStore = new MemoryMessageContextStore();

	new AgentChatBridge(
		params.chat as never,
		'agent-1',
		agentExecutor as AgentExecutorLike,
		params.componentMapper ?? mock<ComponentMapper>(),
		mock<Logger>(),
		'project-1',
		params.integration,
		messageContextStore as unknown as IntegrationMessageContextService,
	);

	const chatIntegrationService = mock<ChatIntegrationService>();
	chatIntegrationService.getChatInstance.mockReturnValue(params.chat);
	const actionExecutor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
	const descriptor = getIntegrationToolConnectionDescriptors([params.integration], 'agent-1')[0];

	return {
		chat: params.chat,
		agentExecutor,
		actionExecutor,
		descriptor,
		integration: params.integration,
		messageContextStore,
		nextStream: (chunks: StreamChunk[]) => {
			stream = chunks;
		},
		shutdown: async () => {
			await params.chat.shutdown();
			Container.reset();
		},
	};
}
