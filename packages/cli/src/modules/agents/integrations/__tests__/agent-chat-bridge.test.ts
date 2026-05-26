import type { StreamChunk } from '@n8n/agents';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { type Logger } from 'n8n-workflow';

import { AgentChatBridge } from '../agent-chat-bridge';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import type { ComponentMapper } from '../component-mapper';
import type { IntegrationMessageContextService } from '../integration-message-context.service';
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

type ChatBotLike = ConstructorParameters<typeof AgentChatBridge>[0];

interface FakeThread {
	id: string;
	channelId?: string;
	subscribe: jest.Mock;
	post: jest.Mock;
	startTyping: jest.Mock;
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
		getAdapter: jest.fn().mockReturnValue(undefined),
	};
	return { bot, handlers };
}

function makeThread(): FakeThread {
	return {
		id: 'thread-1',
		channelId: 'channel-1',
		subscribe: jest.fn().mockResolvedValue(undefined),
		post: jest.fn().mockResolvedValue(undefined),
		startTyping: jest.fn().mockResolvedValue(undefined),
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

// TODO: use real Telegram integration for testing

describe('AgentChatBridge — consumeStream', () => {
	let registry: ChatIntegrationRegistry;
	const componentMapper = mock<ComponentMapper>();
	const logger = mock<Logger>();

	const bufferedIntegration = {
		type: 'test-buffered',
		credentialId: 'cred-1',
	} as unknown as AgentCredentialIntegrationConfig;
	const streamingIntegration = {
		type: 'test-streaming',
		credentialId: 'cred-1',
	} as unknown as AgentCredentialIntegrationConfig;

	beforeEach(() => {
		registry = new ChatIntegrationRegistry();
		registry.register(new BufferingTestIntegration());
		registry.register(new StreamingTestIntegration());
		Container.set(ChatIntegrationRegistry, registry);
	});

	afterEach(() => {
		jest.useRealTimers();
		Container.reset();
		jest.clearAllMocks();
	});

	function makeAgentExecutor(chunks: StreamChunk[]) {
		return {
			executeForChatPublished: jest.fn(() => toStream(chunks)),
			resumeForChat: jest.fn(() => toStream(chunks)),
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
				bufferedIntegration,
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });

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
				bufferedIntegration,
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });

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
				bufferedIntegration,
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });

			expect(thread.post).not.toHaveBeenCalled();
		});
	});

	describe('when integration keeps streaming enabled', () => {
		it('uses the formatted chat thread as the episodic memory partition', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = makeAgentExecutor([{ type: 'finish', finishReason: 'stop' }]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				streamingIntegration,
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });

			expect(agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					memory: expect.objectContaining({
						threadId: expect.objectContaining({ id: 'agent-1:thread-1' }),
						resourceId: 'integration:test-streaming:thread-1',
					}),
				}),
			);
		});

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
				streamingIntegration,
			);

			await handlers.mention!(thread, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });

			expect(thread.post).toHaveBeenCalledTimes(1);
			const received = await drainIterable(thread.post.mock.calls[0][0]);
			expect(received).toBe('Hello world');
		});
	});

	describe('Slack assistant status', () => {
		const slackIntegration = {
			type: 'slack',
			credentialId: 'cred-1',
		} as unknown as AgentCredentialIntegrationConfig;

		it('sets a thinking status before executing a Slack thread message', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = {
				executeForChatPublished: jest.fn(() =>
					toStream([{ type: 'finish', finishReason: 'stop' }]),
				),
				resumeForChat: jest.fn(() => toStream([{ type: 'finish', finishReason: 'stop' }])),
			};

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				slackIntegration,
			);

			await handlers.mention!(thread, {
				text: 'hi',
				raw: {
					channel: 'C123',
					channel_type: 'channel',
					thread_ts: '1779466577.518139',
					ts: '1779466588.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(thread.startTyping).toHaveBeenCalledWith('Thinking...');
			expect(agentExecutor.executeForChatPublished).toHaveBeenCalled();
		});

		it('sets assistant status for top-level Slack channel mentions via the Slack adapter and buffers the response', async () => {
			const { bot, handlers } = makeBot();
			const setAssistantStatus = jest.fn().mockResolvedValue(undefined);
			bot.getAdapter.mockReturnValue({ setAssistantStatus });
			const thread = makeThread();
			const agentExecutor = {
				executeForChatPublished: jest.fn(() =>
					toStream([
						{ type: 'text-delta', id: 't1', delta: 'Hello' },
						{ type: 'finish', finishReason: 'stop' },
					]),
				),
				resumeForChat: jest.fn(() => toStream([{ type: 'finish', finishReason: 'stop' }])),
			};

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				slackIntegration,
			);

			await handlers.mention!(thread, {
				text: 'hi',
				raw: {
					type: 'app_mention',
					channel: 'C123',
					channel_type: 'channel',
					ts: '1779466577.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(thread.startTyping).not.toHaveBeenCalled();
			expect(setAssistantStatus).toHaveBeenCalledWith('C123', '1779466577.518139', 'Thinking...', [
				'Thinking...',
			]);
			expect(thread.post).toHaveBeenCalledWith({ markdown: 'Hello' });
		});

		it('retries top-level Slack assistant status when Slack has not materialized the thread yet', async () => {
			jest.useFakeTimers();
			const { bot, handlers } = makeBot();
			const invalidThreadError = Object.assign(new Error('invalid_thread_ts'), {
				data: { error: 'invalid_thread_ts' },
			});
			const setAssistantStatus = jest
				.fn()
				.mockRejectedValueOnce(invalidThreadError)
				.mockResolvedValue(undefined);
			bot.getAdapter.mockReturnValue({ setAssistantStatus });
			const thread = makeThread();
			const agentExecutor = {
				executeForChatPublished: jest.fn(async function* () {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					yield { type: 'finish' as const, finishReason: 'stop' as const };
				}),
				resumeForChat: jest.fn(() => toStream([{ type: 'finish', finishReason: 'stop' }])),
			};

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				slackIntegration,
			);

			const run = handlers.mention!(thread, {
				text: 'hi',
				raw: {
					type: 'app_mention',
					channel: 'C123',
					channel_type: 'channel',
					ts: '1779466577.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});
			await jest.advanceTimersByTimeAsync(0);

			expect(setAssistantStatus).toHaveBeenCalledTimes(1);
			expect(agentExecutor.executeForChatPublished).toHaveBeenCalled();

			await jest.advanceTimersByTimeAsync(750);
			expect(setAssistantStatus).toHaveBeenCalledTimes(2);

			await jest.advanceTimersByTimeAsync(250);
			await run;
		});

		it('sets a thinking status before resuming a Slack action', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const agentExecutor = {
				executeForChatPublished: jest.fn(() =>
					toStream([{ type: 'finish', finishReason: 'stop' }]),
				),
				resumeForChat: jest.fn(() => toStream([{ type: 'finish', finishReason: 'stop' }])),
			};

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				slackIntegration,
			);

			await handlers.action!({
				actionId: 'resume:run-1:tool-1:0',
				value: '{"approved":true}',
				messageId: 'card-message-1',
				thread,
				threadId: 'thread-1',
				user: { userId: 'u2', userName: 'user2' },
				adapter: { deleteMessage: jest.fn().mockResolvedValue(undefined) },
			});

			expect(thread.startTyping).toHaveBeenCalledWith('Thinking...');
			expect(agentExecutor.resumeForChat).toHaveBeenCalled();
		});
	});

	describe('message context', () => {
		it('strips the Slack bot mention before executing and stores the Slack bot user ID', async () => {
			const { bot, handlers } = makeBot();
			bot.getAdapter.mockReturnValue({ botUserId: 'U_BOT' });
			const thread = makeThread();
			const messageContextStore = mock<IntegrationMessageContextService>();
			messageContextStore.getLatest.mockResolvedValue(null);
			const agentExecutor = makeAgentExecutor([{ type: 'finish', finishReason: 'stop' }]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				{
					type: 'slack',
					credentialId: 'cred-1',
				} as unknown as AgentCredentialIntegrationConfig,
				messageContextStore,
			);

			await handlers.mention!(thread, {
				id: 'message-1',
				text: '@U_BOT hello',
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'hello',
				}),
			);
			expect(messageContextStore.setLatest).toHaveBeenCalledWith(
				'thread-1',
				'u1',
				expect.objectContaining({
					agentUserId: 'U_BOT',
					interactingUserId: 'u1',
					messageId: 'message-1',
				}),
			);
		});

		it('stores a sanitized message subject from the inbound message', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const messageContextStore = mock<IntegrationMessageContextService>();
			messageContextStore.getLatest.mockResolvedValue(null);
			const agentExecutor = makeAgentExecutor([{ type: 'finish', finishReason: 'stop' }]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				streamingIntegration,
				messageContextStore,
			);

			await handlers.mention!(thread, {
				id: 'message-1',
				text: 'what is this about?',
				author: { userId: 'u1', userName: 'user1' },
				get subject() {
					return Promise.resolve({
						type: 'issue',
						id: 'ENG-123',
						title: 'Fix signup',
						description: 'Signup fails for invited users',
						status: 'In Progress',
						url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
						labels: ['Bug'],
						assignee: { id: 'user-2', name: 'Michael Drury' },
						author: { id: 'user-3', name: 'Ada Lovelace' },
						raw: { internal: 'not persisted' },
					});
				},
			});

			expect(messageContextStore.setLatest).toHaveBeenCalledWith(
				'thread-1',
				'u1',
				expect.objectContaining({
					integrationConnectionId: 'test-streaming:cred-1',
					platform: 'test-streaming',
					target: { type: 'thread', threadId: 'thread-1', channelId: 'channel-1' },
					messageId: 'message-1',
					interactingUserId: 'u1',
					subject: {
						type: 'issue',
						id: 'ENG-123',
						title: 'Fix signup',
						description: 'Signup fails for invited users',
						status: 'In Progress',
						url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
						labels: ['Bug'],
						assignee: { id: 'user-2', name: 'Michael Drury' },
						author: { id: 'user-3', name: 'Ada Lovelace' },
					},
				}),
			);
		});

		it('keeps the previous subject when an action click updates the latest context', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			const messageContextStore = mock<IntegrationMessageContextService>();
			messageContextStore.getLatest.mockResolvedValue({
				integrationConnectionId: 'test-streaming:cred-1',
				platform: 'test-streaming',
				target: { type: 'thread', threadId: 'thread-1', channelId: 'channel-1' },
				messageId: 'message-1',
				interactingUserId: 'u1',
				agentUserId: 'U_BOT',
				subject: {
					type: 'issue',
					id: 'ENG-123',
					title: 'Fix signup',
				},
				updatedAt: '2026-05-18T10:00:00.000Z',
			});
			const agentExecutor = makeAgentExecutor([{ type: 'finish', finishReason: 'stop' }]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				streamingIntegration,
				messageContextStore,
			);

			await handlers.action!({
				actionId: 'resume:run-1:tool-1:0',
				value: '{"approved":true}',
				messageId: 'card-message-1',
				thread,
				threadId: 'thread-1',
				user: { userId: 'u2', userName: 'user2' },
				adapter: { deleteMessage: jest.fn().mockResolvedValue(undefined) },
			});

			expect(messageContextStore.setLatest).toHaveBeenCalledWith(
				'thread-1',
				'u2',
				expect.objectContaining({
					messageId: 'card-message-1',
					interactingUserId: 'u2',
					agentUserId: 'U_BOT',
					subject: {
						type: 'issue',
						id: 'ENG-123',
						title: 'Fix signup',
					},
				}),
			);
		});
	});
});
