import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { MemoryMessageContextStore } from '../telegram/replay-test-context';
import { AgentChatBridge } from '../../../agent-chat-bridge';
import { ChatIntegrationRegistry } from '../../../agent-chat-integration';
import type { ChatIntegrationService, ChatInstance } from '../../../chat-integration.service';
import { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type { IntegrationMessageContextService } from '../../../integration-message-context.service';
import type { IntegrationMessageContext } from '../../../integration-tools';
import { getIntegrationToolConnectionDescriptors } from '../../../integration-tools';
import { SlackIntegration } from '../../../platforms/slack-integration';

type AgentExecutorLike = ConstructorParameters<typeof AgentChatBridge>[2];

export interface SlackUserFixture {
	id: string;
	name: string;
	real_name: string;
}

export interface SlackChannelFixture {
	id: string;
	name: string;
}

export interface SlackEventFixture {
	token?: string;
	type: 'event_callback';
	team_id: string;
	authorizations?: Array<{
		team_id: string;
		user_id: string;
		is_bot: boolean;
	}>;
	event: {
		type: string;
		subtype?: string;
		user: string;
		text: string;
		ts: string;
		thread_ts?: string;
		channel: string;
		channel_type: string;
		team?: string;
		bot_id?: string;
	};
}

export interface SlackReplayFixtures {
	botUserId: string;
	user: SlackUserFixture;
	channel: SlackChannelFixture;
	mention: SlackEventFixture;
	followUp: SlackEventFixture;
	selfMessage: SlackEventFixture;
}

export interface SlackApiCall {
	method: string;
	body: Record<string, unknown>;
}

export interface SlackReplayContext {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: jest.Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	apiCalls: SlackApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => SlackApiCall | undefined;
	shutdown: () => Promise<void>;
}

interface TestAuthor {
	userId: string;
	userName: string;
	fullName: string;
	isBot: boolean;
	isMe: boolean;
}

interface TestMessage {
	id: string;
	threadId: string;
	text: string;
	raw: SlackEventFixture['event'];
	author: TestAuthor;
	isMention: boolean;
	subject: Promise<null>;
}

type TestPostable = string | { markdown: string } | AsyncIterable<string>;

function isAsyncIterable(value: unknown): value is AsyncIterable<string> {
	return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

async function postableToText(message: TestPostable): Promise<string> {
	if (typeof message === 'string') return message;
	if (isAsyncIterable(message)) {
		let text = '';
		for await (const chunk of message) text += chunk;
		return text;
	}
	return message.markdown;
}

class SlackThread {
	readonly channelId: string;

	constructor(
		readonly id: string,
		readonly adapter: TestSlackAdapter,
		private readonly chat: TestSlackChat,
	) {
		this.channelId = adapter.channelIdFromThreadId(id);
	}

	async subscribe(): Promise<void> {
		this.chat.subscribe(this.id);
		await Promise.resolve();
	}

	async post(message: TestPostable): Promise<{ id: string; threadId: string }> {
		return await this.adapter.postMessage(this.id, message);
	}

	async startTyping(): Promise<void> {
		await Promise.resolve();
	}
}

class TestSlackChat {
	readonly webhooks: Record<
		string,
		(
			request: Request,
			options?: { waitUntil?: (task: Promise<unknown>) => void },
		) => Promise<Response>
	>;

	private readonly subscribedThreadIds = new Set<string>();

	private readonly mentionHandlers: Array<
		(thread: SlackThread, message: TestMessage) => Promise<void>
	> = [];

	private readonly subscribedHandlers: Array<
		(thread: SlackThread, message: TestMessage) => Promise<void>
	> = [];

	private readonly actionHandlers: Array<(event: unknown) => Promise<void>> = [];

	constructor(readonly adapter: TestSlackAdapter) {
		this.webhooks = {
			slack: async (request, options) => await adapter.handleWebhook(request, options),
		};
	}

	onNewMention(handler: (thread: SlackThread, message: TestMessage) => Promise<void>): void {
		this.mentionHandlers.push(handler);
	}

	onSubscribedMessage(handler: (thread: SlackThread, message: TestMessage) => Promise<void>): void {
		this.subscribedHandlers.push(handler);
	}

	onAction(handler: (event: unknown) => Promise<void>): void {
		this.actionHandlers.push(handler);
	}

	getAdapter(name: string): unknown {
		return name === 'slack' ? this.adapter : undefined;
	}

	thread(threadId: string): SlackThread {
		return new SlackThread(threadId, this.adapter, this);
	}

	channel(channelId: string): {
		post: (message: TestPostable) => Promise<{ id: string; threadId: string }>;
	} {
		return {
			post: async (message) => await this.adapter.postChannelMessage(channelId, message),
		};
	}

	async openDM(userId: string): Promise<SlackThread> {
		return await Promise.resolve(this.thread(`slack:D_${userId}:1719000000.000100`));
	}

	async getUser(userId: string) {
		return await Promise.resolve({
			userId,
			userName: userId,
			fullName: userId,
			isBot: userId === this.adapter.botUserId,
			email: undefined,
		});
	}

	async initialize(): Promise<void> {}

	async shutdown(): Promise<void> {}

	subscribe(threadId: string): void {
		this.subscribedThreadIds.add(threadId);
	}

	processMessage(
		_adapter: TestSlackAdapter,
		threadId: string,
		message: TestMessage,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): void {
		const task = this.dispatchMessage(threadId, message);
		options?.waitUntil?.(task);
	}

	private async dispatchMessage(threadId: string, message: TestMessage): Promise<void> {
		if (message.author.isMe) return;
		const thread = this.thread(threadId);
		if (this.subscribedThreadIds.has(threadId)) {
			await Promise.all(
				this.subscribedHandlers.map(async (handler) => await handler(thread, message)),
			);
			return;
		}
		if (message.isMention || this.adapter.isDM(threadId)) {
			await Promise.all(
				this.mentionHandlers.map(async (handler) => await handler(thread, message)),
			);
		}
	}
}

class TestSlackAdapter {
	readonly name = 'slack';

	constructor(
		readonly botUserId: string,
		private readonly user: SlackUserFixture,
		private readonly apiCalls: SlackApiCall[],
	) {}

	private chat: TestSlackChat | undefined;

	attach(chat: TestSlackChat): void {
		this.chat = chat;
	}

	async handleWebhook(
		request: Request,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): Promise<Response> {
		const payload = (await request.json()) as SlackEventFixture;
		const event = payload.event;
		const threadTs = event.thread_ts ?? (event.channel_type === 'im' ? '' : event.ts);
		const threadId = `slack:${event.channel}:${threadTs}`;
		this.chat?.processMessage(this, threadId, this.parseMessage(event, threadId), options);
		return new Response('OK', { status: 200 });
	}

	async postMessage(
		threadId: string,
		message: TestPostable,
	): Promise<{ id: string; threadId: string }> {
		await Promise.resolve();
		const body = {
			channel: this.channelIdFromThreadId(threadId),
			thread_ts: this.threadTsFromThreadId(threadId),
			text: await postableToText(message),
		};
		this.apiCalls.push({ method: 'postMessage', body });
		return { id: `${body.channel}:1719000999.000999`, threadId };
	}

	async postChannelMessage(
		channelId: string,
		message: TestPostable,
	): Promise<{ id: string; threadId: string }> {
		await Promise.resolve();
		const body = {
			channel: channelId.replace(/^slack:/, ''),
			text: await postableToText(message),
		};
		this.apiCalls.push({ method: 'postMessage', body });
		return {
			id: `${body.channel}:1719000999.000999`,
			threadId: `slack:${body.channel}:1719000999.000999`,
		};
	}

	channelIdFromThreadId(threadId: string): string {
		return threadId.split(':')[1] ?? threadId;
	}

	isDM(threadId: string): boolean {
		return this.channelIdFromThreadId(threadId).startsWith('D');
	}

	private threadTsFromThreadId(threadId: string): string {
		return threadId.split(':').slice(2).join(':');
	}

	private parseMessage(event: SlackEventFixture['event'], threadId: string): TestMessage {
		const isMe = event.user === this.botUserId || Boolean(event.bot_id);
		return {
			id: event.ts,
			threadId,
			text: event.text,
			raw: event,
			author: {
				userId: event.user,
				userName: event.user === this.user.id ? this.user.name : event.user,
				fullName: event.user === this.user.id ? this.user.real_name : event.user,
				isBot: isMe,
				isMe,
			},
			isMention: event.type === 'app_mention' || event.text.includes(`<@${this.botUserId}>`),
			subject: Promise.resolve(null),
		};
	}
}

function toStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* stream() {
		await Promise.resolve();
		for (const chunk of chunks) yield chunk;
	})();
}

export async function createSlackReplayContext(
	fixtures: SlackReplayFixtures,
	options: { stream?: StreamChunk[] } = {},
): Promise<SlackReplayContext> {
	await Promise.resolve();
	const apiCalls: SlackApiCall[] = [];
	const adapter = new TestSlackAdapter(fixtures.botUserId, fixtures.user, apiCalls);
	const chat = new TestSlackChat(adapter);
	adapter.attach(chat);

	const registry = new ChatIntegrationRegistry();
	registry.register(new SlackIntegration());
	Container.set(ChatIntegrationRegistry, registry);

	const stream = options.stream ?? [
		{ type: 'text-delta', id: 'text-1', delta: 'Got it' },
		{ type: 'finish', finishReason: 'stop' },
	];
	const agentExecutor = {
		executeForChatPublished: jest.fn(() => toStream(stream)),
		resumeForChat: jest.fn(() => toStream(stream)),
	};
	const messageContextStore = new MemoryMessageContextStore();
	const integration: AgentIntegrationConfig = {
		type: 'slack',
		credentialId: 'cred-slack',
	};

	new AgentChatBridge(
		chat as never,
		'agent-1',
		agentExecutor as AgentExecutorLike,
		mock(),
		mock<Logger>(),
		'project-1',
		integration,
		messageContextStore as unknown as IntegrationMessageContextService,
	);

	const chatIntegrationService = mock<ChatIntegrationService>();
	chatIntegrationService.getChatInstance.mockReturnValue(chat as never);
	const actionExecutor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
	const descriptor = getIntegrationToolConnectionDescriptors([integration], 'agent-1')[0];

	const sendWebhook = async (payload: unknown) => {
		const tasks: Array<Promise<unknown>> = [];
		const headers = new Headers();
		headers.set('content-type', 'application/json');
		const response = await chat.webhooks.slack(
			new Request(
				'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
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
		agentExecutor,
		actionExecutor,
		apiCalls,
		descriptor,
		integration,
		messageContextStore,
		sendWebhook,
		latestContext: () => messageContextStore.latest(),
		latestThreadId: () => messageContextStore.latestThreadId(),
		lastPost: () => apiCalls.filter((call) => call.method === 'postMessage').at(-1),
		shutdown: async () => {
			await chat.shutdown();
			Container.reset();
		},
	};
}
