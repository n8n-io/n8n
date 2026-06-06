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
import type { AgentIntegrationConfig } from '@n8n/api-types';

type ChatBotLike = ConstructorParameters<typeof AgentChatBridge>[0];

interface FakeThread {
	id: string;
	channelId?: string;
	adapter?: { botUserId?: string };
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

function makeThread(id = 'thread-1', adapter?: FakeThread['adapter']): FakeThread {
	return {
		id,
		channelId: 'channel-1',
		adapter,
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

class FormattedBufferedTestIntegration extends AgentChatIntegration {
	readonly type = 'test-formatted-buffered';
	readonly credentialTypes: string[] = [];
	readonly supportedComponents: string[] = [];
	readonly description = '';
	readonly displayLabel = 'Test Formatted Buffered';
	readonly displayIcon = 'circle';
	readonly disableStreaming = true;
	readonly formatThreadId = {
		fromSdk: (thread: { id: string; adapter?: { botUserId?: string } }) =>
			`chat:${thread.adapter?.botUserId ?? 'bot'}-${thread.id}`,
		toSdk: (threadId: string) => threadId.split('-').slice(1).join('-'),
	};
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
	} as unknown as AgentIntegrationConfig;
	const streamingIntegration = {
		type: 'test-streaming',
		credentialId: 'cred-1',
	} as unknown as AgentIntegrationConfig;

	beforeEach(() => {
		registry = new ChatIntegrationRegistry();
		registry.register(new BufferingTestIntegration());
		registry.register(new StreamingTestIntegration());
		registry.register(new FormattedBufferedTestIntegration());
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

		it('includes tool approval details when posting a suspension card', async () => {
			const { bot, handlers } = makeBot();
			const thread = makeThread();
			componentMapper.toCard.mockResolvedValue({ kind: 'card' } as never);

			const agentExecutor = makeAgentExecutor([
				{
					type: 'tool-call-suspended',
					runId: 'run-1',
					toolCallId: 'tool-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'giphy-gif-search',
						displayName: 'GIPHY GIF Search',
						args: { query: 'project status', limit: 3 },
					},
				},
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

			expect(componentMapper.toCard).toHaveBeenCalledWith(
				{
					title: 'Approval required',
					components: [
						{
							type: 'section',
							text: 'The agent wants to run this tool: GIPHY GIF Search',
						},
						{
							type: 'fields',
							fields: [
								{ label: 'Tool', value: 'GIPHY GIF Search' },
								{
									label: 'Input',
									value: '{\n  "query": "project status",\n  "limit": 3\n}',
								},
							],
						},
						{ type: 'button', label: 'Approve', value: 'true', style: 'primary' },
						{ type: 'button', label: 'Deny', value: 'false', style: 'danger' },
					],
				},
				'run-1',
				'tool-1',
				undefined,
				undefined,
				'test-buffered',
			);
			expect(thread.post).toHaveBeenCalledWith({ card: { kind: 'card' } });
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

	describe('when deriving memory scope', () => {
		it('uses the platform user as the episodic memory partition across threads', async () => {
			const { bot, handlers } = makeBot();
			const thread1 = makeThread('thread-1');
			const thread2 = makeThread('thread-2');
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

			await handlers.mention!(thread1, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });
			await handlers.mention!(thread2, {
				text: 'what did we discuss?',
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(agentExecutor.executeForChatPublished).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					memory: expect.objectContaining({
						threadId: expect.objectContaining({ id: 'agent-1:thread-1' }),
						resourceId: 'integration:test-streaming:u1',
					}),
				}),
			);
			expect(agentExecutor.executeForChatPublished).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					memory: expect.objectContaining({
						threadId: expect.objectContaining({ id: 'agent-1:thread-2' }),
						resourceId: 'integration:test-streaming:u1',
					}),
				}),
			);
		});

		it('keeps a formatted thread ID separate from the platform user memory partition', async () => {
			const { bot, handlers } = makeBot();
			const thread1 = makeThread('1001', { botUserId: 'bot-1' });
			const thread2 = makeThread('1002', { botUserId: 'bot-1' });
			const agentExecutor = makeAgentExecutor([{ type: 'finish', finishReason: 'stop' }]);

			new AgentChatBridge(
				bot as unknown as ChatBotLike,
				'agent-1',
				agentExecutor as never,
				componentMapper,
				logger,
				'project-1',
				{
					type: 'test-formatted-buffered',
					credentialId: 'cred-1',
				} as unknown as AgentIntegrationConfig,
			);

			await handlers.mention!(thread1, { text: 'hi', author: { userId: 'u1', userName: 'user1' } });
			await handlers.mention!(thread2, {
				text: 'what did we discuss?',
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(agentExecutor.executeForChatPublished).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					memory: expect.objectContaining({
						threadId: expect.objectContaining({ id: 'agent-1:chat:bot-1-1001' }),
						resourceId: 'integration:test-formatted-buffered:u1',
					}),
				}),
			);
			expect(agentExecutor.executeForChatPublished).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					memory: expect.objectContaining({
						threadId: expect.objectContaining({ id: 'agent-1:chat:bot-1-1002' }),
						resourceId: 'integration:test-formatted-buffered:u1',
					}),
				}),
			);
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
		} as unknown as AgentIntegrationConfig;

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

		it('clears assistant status before responding directly to top-level Slack DMs', async () => {
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
					type: 'message',
					channel: 'D123',
					channel_type: 'im',
					ts: '1779466577.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});

			expect(setAssistantStatus).toHaveBeenNthCalledWith(
				1,
				'D123',
				'1779466577.518139',
				'Thinking...',
				['Thinking...'],
			);
			expect(setAssistantStatus).toHaveBeenNthCalledWith(2, 'D123', '1779466577.518139', '');
			expect(setAssistantStatus.mock.invocationCallOrder[1]).toBeLessThan(
				thread.post.mock.invocationCallOrder[0],
			);
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

		it('does not re-set Slack DM status with a stale retry after it has been cleared', async () => {
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
				// Respond (which clears the status) while the initial "Thinking..."
				// set is still waiting out its retry delay, then keep the stream open
				// past that delay so the retry would otherwise fire after the clear.
				executeForChatPublished: jest.fn(async function* (): AsyncGenerator<StreamChunk> {
					yield { type: 'text-delta', id: 't1', delta: 'Hello' };
					yield { type: 'message', message: { role: 'assistant', content: [] } };
					await new Promise((resolve) => setTimeout(resolve, 2000));
					yield { type: 'finish', finishReason: 'stop' };
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
					type: 'message',
					channel: 'D123',
					channel_type: 'im',
					ts: '1779466577.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});

			// Let the response flush and clear the status, then run past the retry
			// delay and finish the stream.
			await jest.advanceTimersByTimeAsync(2000);
			await run;

			const thinkingCalls = setAssistantStatus.mock.calls.filter((c) => c[2] === 'Thinking...');
			const clearCalls = setAssistantStatus.mock.calls.filter((c) => c[2] === '');
			// The cleared retry must not re-set "Thinking..." — only the initial set.
			expect(thinkingCalls).toHaveLength(1);
			expect(clearCalls).toHaveLength(1);
			// The last status written must be the clear, never a stale "Thinking...".
			expect(setAssistantStatus.mock.calls.at(-1)?.[2]).toBe('');
		});

		it('waits for an in-flight Slack DM status set to settle before clearing', async () => {
			const { bot, handlers } = makeBot();
			// Keep the initial "Thinking..." set in flight; the empty-status clear
			// resolves immediately. Aborting can't recall an in-flight remote write,
			// so the clear must wait for the set to land before overwriting it.
			let resolveSet!: () => void;
			const setInFlight = new Promise<void>((resolve) => {
				resolveSet = resolve;
			});
			const setAssistantStatus = jest.fn(async (_channel: string, _ts: string, status: string) => {
				if (status === 'Thinking...') await setInFlight;
			});
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

			const run = handlers.mention!(thread, {
				text: 'hi',
				raw: {
					type: 'message',
					channel: 'D123',
					channel_type: 'im',
					ts: '1779466577.518139',
				},
				author: { userId: 'u1', userName: 'user1' },
			});

			// Drain everything that can proceed. The clear is blocked on the
			// in-flight set, so the empty-status write must not have happened yet.
			for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));

			expect(setAssistantStatus).toHaveBeenCalledTimes(1);
			expect(setAssistantStatus).toHaveBeenLastCalledWith(
				'D123',
				'1779466577.518139',
				'Thinking...',
				['Thinking...'],
			);

			// Let the in-flight set land; only now may the clear overwrite it.
			resolveSet();
			await run;

			expect(setAssistantStatus).toHaveBeenCalledTimes(2);
			expect(setAssistantStatus).toHaveBeenLastCalledWith('D123', '1779466577.518139', '');
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
				} as unknown as AgentIntegrationConfig,
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
				'agent-1:thread-1',
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
				'agent-1:thread-1',
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
				'agent-1:thread-1',
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
