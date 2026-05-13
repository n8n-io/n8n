import type { StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { ChatAuthenticationProxyService } from '@/services/chat-authentication-proxy.service';
import { UrlService } from '@/services/url.service';

import { AgentChatBridge } from '../agent-chat-bridge';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import type { ComponentMapper } from '../component-mapper';

type ChatBotLike = ConstructorParameters<typeof AgentChatBridge>[0];

interface FakeThread {
	id: string;
	subscribe: jest.Mock;
	post: jest.Mock;
}

function makeBot() {
	const handlers: {
		mention?: (thread: unknown, message: unknown) => Promise<void>;
		subscribed?: (thread: unknown, message: unknown) => Promise<void>;
		action?: (event: unknown) => Promise<void>;
	} = {};
	const bot = {
		onNewMention: (h: typeof handlers.mention) => {
			handlers.mention = h;
		},
		onSubscribedMessage: (h: typeof handlers.subscribed) => {
			handlers.subscribed = h;
		},
		onAction: (h: typeof handlers.action) => {
			handlers.action = h;
		},
	};
	return { bot, handlers };
}

function makeThread(): FakeThread {
	return {
		id: 'thread-1',
		subscribe: jest.fn().mockResolvedValue(undefined),
		post: jest.fn().mockResolvedValue(undefined),
	};
}

async function* toStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	for (const c of chunks) yield c;
}

async function drainIterable(value: unknown): Promise<string> {
	if (typeof value === 'string') return value;
	if (
		value &&
		typeof value === 'object' &&
		Symbol.asyncIterator in (value as Record<PropertyKey, unknown>)
	) {
		let out = '';
		for await (const part of value as AsyncIterable<string>) out += part;
		return out;
	}
	throw new Error(`post() received unexpected argument: ${JSON.stringify(value)}`);
}

class BufferingTestIntegration extends AgentChatIntegration {
	readonly type = 'test-buffered';
	readonly credentialTypes: string[] = [];
	readonly supportedComponents: string[] = [];
	readonly description = '';
	readonly displayLabel = 'Test Buffered';
	readonly displayIcon = 'circle';
	readonly disableStreaming = true;
	async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
		return {};
	}
}

class StreamingTestIntegration extends AgentChatIntegration {
	readonly type = 'test-streaming';
	readonly credentialTypes: string[] = [];
	readonly supportedComponents: string[] = [];
	readonly description = '';
	readonly displayLabel = 'Test Streaming';
	readonly displayIcon = 'circle';
	async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
		return {};
	}
}

class AuthGatedTestIntegration extends AgentChatIntegration {
	readonly type = 'telegram';
	readonly credentialTypes: string[] = [];
	readonly supportedComponents: string[] = [];
	readonly description = '';
	readonly displayLabel = 'Test Auth Gated';
	readonly displayIcon = 'circle';
	readonly disableStreaming = true;
	readonly requiresUserAuth = true;
	async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
		return {};
	}
}

describe('AgentChatBridge — consumeStream', () => {
	let registry: ChatIntegrationRegistry;
	const componentMapper = mock<ComponentMapper>();
	const logger = mock<Logger>();

	beforeEach(() => {
		registry = new ChatIntegrationRegistry();
		registry.register(new BufferingTestIntegration());
		registry.register(new StreamingTestIntegration());
		Container.set(ChatIntegrationRegistry, registry);
	});

	afterEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	function makeAgentExecutor(chunks: StreamChunk[]) {
		return {
			executeForChatPublished: () => toStream(chunks),
			resumeForChat: () => toStream(chunks),
		};
	}

	describe('when integration disables streaming', () => {
		it('posts a single collected string for a run that only has text deltas', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = makeAgentExecutor([
				{ type: 'text-delta', id: 't1', delta: 'Hello ' },
				{ type: 'text-delta', id: 't1', delta: 'world' },
				{ type: 'finish', finishReason: 'stop' },
			]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				'test-buffered',
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

			expect(thread.post).toHaveBeenCalledTimes(1);
			expect(thread.post).toHaveBeenCalledWith({ markdown: 'Hello world' });
		});

		it('flushes the buffer before posting a suspension card, then continues buffering', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			componentMapper.toCard.mockResolvedValue({ kind: 'card' } as never);

			const agentExecutor = makeAgentExecutor([
				{ type: 'text-delta', id: 't1', delta: 'Before suspend. ' },
				{
					type: 'tool-call-suspended',
					runId: 'run-1',
					toolCallId: 'tool-1',
					toolName: 'approval',
					suspendPayload: { message: 'Approve?' },
				},
				{ type: 'text-delta', id: 't2', delta: 'After resume.' },
				{ type: 'finish', finishReason: 'stop' },
			]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				'test-buffered',
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

			expect(thread.post).toHaveBeenCalledTimes(3);
			expect(thread.post).toHaveBeenNthCalledWith(1, { markdown: 'Before suspend. ' });
			expect(thread.post).toHaveBeenNthCalledWith(2, { card: { kind: 'card' } });
			expect(thread.post).toHaveBeenNthCalledWith(3, { markdown: 'After resume.' });
		});

		it('does not post when the buffer is only whitespace', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = makeAgentExecutor([
				{ type: 'text-delta', id: 't1', delta: '   ' },
				{ type: 'finish', finishReason: 'stop' },
			]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				'test-buffered',
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

			expect(thread.post).not.toHaveBeenCalled();
		});
	});

	describe('when integration keeps streaming enabled', () => {
		it('posts an AsyncIterable whose drained content equals the concatenated deltas', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = makeAgentExecutor([
				{ type: 'text-delta', id: 't1', delta: 'Hello ' },
				{ type: 'text-delta', id: 't1', delta: 'world' },
				{ type: 'finish', finishReason: 'stop' },
			]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				'test-streaming',
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

			expect(thread.post).toHaveBeenCalledTimes(1);
			const received = await drainIterable(thread.post.mock.calls[0][0]);
			expect(received).toBe('Hello world');
		});
	});
});

describe('AgentChatBridge — auth gate', () => {
	const componentMapper = mock<ComponentMapper>();
	const logger = mock<Logger>();
	const chatAuth = mock<ChatAuthenticationProxyService>();
	const urlService = mock<UrlService>();
	const fakeUser = mock<User>();

	beforeEach(() => {
		const registry = new ChatIntegrationRegistry();
		registry.register(new AuthGatedTestIntegration());
		registry.register(new BufferingTestIntegration());
		Container.set(ChatIntegrationRegistry, registry);
		Container.set(ChatAuthenticationProxyService, chatAuth);
		Container.set(UrlService, urlService);
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
	});

	afterEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	function makeAgentExecutor() {
		return {
			executeForChatPublished: jest.fn(async function* () {
				yield { type: 'finish', finishReason: 'stop' } as StreamChunk;
			}),
			resumeForChat: jest.fn(async function* () {
				yield { type: 'finish', finishReason: 'stop' } as StreamChunk;
			}),
		};
	}

	it('lets linked users through to executeForChatPublished', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(fakeUser);
		const { bot, handlers } = makeBot();
		const thread = makeThread();
		const agentExecutor = makeAgentExecutor();

		new AgentChatBridge(
			bot as unknown as ChatBotLike,
			'agent-1',
			agentExecutor as never,
			componentMapper,
			logger,
			'project-1',
			'telegram',
		);

		await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

		expect(agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
		expect(thread.subscribe).toHaveBeenCalledTimes(1);
	});

	it('drops unlinked onNewMention events and posts a linking code', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockResolvedValue('123456789');
		const { bot, handlers } = makeBot();
		const thread = makeThread();
		const agentExecutor = makeAgentExecutor();

		new AgentChatBridge(
			bot as unknown as ChatBotLike,
			'agent-1',
			agentExecutor as never,
			componentMapper,
			logger,
			'project-1',
			'telegram',
		);

		await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

		expect(agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		expect(thread.subscribe).not.toHaveBeenCalled();
		expect(thread.post).toHaveBeenCalledTimes(1);
		const arg = thread.post.mock.calls[0][0] as { markdown: string };
		expect(arg.markdown).toContain('123456789');
		expect(arg.markdown).toContain('https://n8n.example.com/settings/personal');
	});

	it('drops unlinked onSubscribedMessage events', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockResolvedValue('987654321');
		const { bot, handlers } = makeBot();
		const thread = makeThread();
		const agentExecutor = makeAgentExecutor();

		new AgentChatBridge(
			bot as unknown as ChatBotLike,
			'agent-1',
			agentExecutor as never,
			componentMapper,
			logger,
			'project-1',
			'telegram',
		);

		await handlers.subscribed!(thread, { text: 'hi', author: { userId: 'u1' } });

		expect(agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		expect(thread.post).toHaveBeenCalledTimes(1);
	});

	it('drops unlinked onAction events without resuming', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockResolvedValue('111222333');
		const { bot, handlers } = makeBot();
		const thread = makeThread();
		const agentExecutor = makeAgentExecutor();

		new AgentChatBridge(
			bot as unknown as ChatBotLike,
			'agent-1',
			agentExecutor as never,
			componentMapper,
			logger,
			'project-1',
			'telegram',
		);

		await handlers.action!({
			actionId: 'ri-btn:run-1:tool-1:0',
			thread,
			value: '',
			user: { userId: 'u1' },
			adapter: {} as never,
			messageId: 'm1',
			threadId: 'thread-1',
			openModal: jest.fn(),
			raw: {},
		});

		expect(agentExecutor.resumeForChat).not.toHaveBeenCalled();
		expect(thread.post).toHaveBeenCalledTimes(1);
	});

	it('does not affect integrations without requiresUserAuth', async () => {
		const { bot, handlers } = makeBot();
		const thread = makeThread();
		const agentExecutor = makeAgentExecutor();

		new AgentChatBridge(
			bot as unknown as ChatBotLike,
			'agent-1',
			agentExecutor as never,
			componentMapper,
			logger,
			'project-1',
			'test-buffered',
		);

		await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1' } });

		expect(agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
		expect(chatAuth.getUserByChatUserId).not.toHaveBeenCalled();
	});
});
