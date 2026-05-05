import type { StreamChunk } from '@n8n/agents';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

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
