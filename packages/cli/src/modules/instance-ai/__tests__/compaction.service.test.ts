// Manual mock — must be declared before any imports that touch the mocked module.
const mockGenerateCompactionSummary = jest.fn();
jest.mock('@n8n/instance-ai', () => ({
	generateCompactionSummary: (...args: unknown[]) => mockGenerateCompactionSummary(...args),
	// Inline the patchThread fallback path (getThreadById → update → updateThread)
	patchThread: async (
		memory: { getThreadById: Function; updateThread: Function },
		args: { threadId: string; update: Function },
	) => {
		const thread = await memory.getThreadById({ threadId: args.threadId });
		if (!thread) return null;
		const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
		if (!patch) return thread;
		return await memory.updateThread({
			id: args.threadId,
			title: patch.title ?? thread.title ?? args.threadId,
			metadata: patch.metadata ?? thread.metadata ?? {},
		});
	},
}));

jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class MemoryStorage {},
	MastraCompositeStore: class MastraCompositeStore {},
}));
jest.mock('@mastra/memory', () => ({}));

import { InstanceAiCompactionService } from '../compaction.service';

interface MockMessage {
	id: string;
	role: string;
	content: unknown;
	createdAt: Date;
	threadId: string;
}

/**
 * Create a message with controllable size.
 * ~4 chars per token, so `tokenCount` tokens ≈ `tokenCount * 4` chars.
 */
function createMessage(
	id: string,
	role: 'user' | 'assistant',
	text: string,
	tokenCount?: number,
): MockMessage {
	// If a specific token count is requested, pad the text to that size
	const content = tokenCount ? text + 'x'.repeat(Math.max(0, tokenCount * 4 - text.length)) : text;
	return {
		id,
		role,
		content: { content: [{ type: 'text', text: content }] },
		createdAt: new Date(),
		threadId: 'thread-1',
	};
}

function createToolMessage(id: string): MockMessage {
	return {
		id,
		role: 'tool',
		content: { content: [{ type: 'tool-result', toolCallId: 'tc-1', result: '{}' }] },
		createdAt: new Date(),
		threadId: 'thread-1',
	};
}

function createMockMemory(metadata?: Record<string, unknown>) {
	return {
		getThreadById: jest.fn().mockResolvedValue({
			id: 'thread-1',
			title: 'Test Thread',
			metadata: metadata ?? {},
		}),
		updateThread: jest.fn().mockResolvedValue({}),
	};
}

function createService(
	messages: MockMessage[],
	maxContextWindowTokens = 0,
): InstanceAiCompactionService {
	const mockLogger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
	const mockStorage = {
		listMessages: jest.fn().mockResolvedValue({
			messages,
			total: messages.length,
			page: 0,
			perPage: false,
			hasMore: false,
		}),
	};
	const mockGlobalConfig = {
		instanceAi: { maxContextWindowTokens },
	};
	return new InstanceAiCompactionService(
		mockLogger as never,
		mockStorage as never,
		mockGlobalConfig as never,
	);
}

// Claude context window = 200k tokens. At 80% threshold = 160k tokens trigger.
// With 8k overhead, messages need ~152k tokens to trigger.
// For test convenience, we use a low threshold (0.1 = 10%) so smaller messages trigger.

describe('InstanceAiCompactionService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('thread below token threshold', () => {
		it('should not compact when total tokens are below the threshold', async () => {
			// Small messages, well below any threshold
			const messages = Array.from({ length: 30 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Short msg ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.8, // 80% of 200k = 160k tokens — tiny messages won't reach this
			);

			expect(result).toBeNull();
			expect(mockGenerateCompactionSummary).not.toHaveBeenCalled();
		});
	});

	describe('thread above token threshold', () => {
		it('should compact when total tokens exceed the threshold', async () => {
			// Create messages with ~5000 tokens each = 40 * 5000 = 200k tokens
			// With overhead (8k), total = ~208k. At 80% of 200k (160k), this triggers.
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`, 5000),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockResolvedValue('### Goal\nTest goal');

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.8,
			);

			expect(result).toContain('<conversation-summary>');
			expect(mockGenerateCompactionSummary).toHaveBeenCalledTimes(1);

			// Should persist with upToMessageId at the end of the prefix
			const updateCall = memory.updateThread.mock.calls[0][0];
			const savedMetadata = updateCall.metadata.instanceAiConversationSummary;
			expect(savedMetadata.version).toBe(1);
			expect(savedMetadata.upToMessageId).toBe('msg-19'); // 40 - 20 = index 19
		});
	});

	describe('incremental compaction', () => {
		it('should only summarize the delta after the stored upToMessageId', async () => {
			const messages = Array.from({ length: 50 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`, 4000),
			);
			const service = createService(messages);
			const memory = createMockMemory({
				instanceAiConversationSummary: {
					version: 1,
					upToMessageId: 'msg-14',
					summary: 'Previous summary content',
					updatedAt: '2025-01-01T00:00:00Z',
				},
			});

			mockGenerateCompactionSummary.mockResolvedValue('### Goal\nUpdated goal');

			await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.8,
			);

			// Should pass previous summary for merging
			const [, input] = mockGenerateCompactionSummary.mock.calls[0];
			expect(input.previousSummary).toBe('Previous summary content');

			// Should advance upToMessageId
			const updateCall = memory.updateThread.mock.calls[0][0];
			const savedMetadata = updateCall.metadata.instanceAiConversationSummary;
			expect(savedMetadata.version).toBe(2);
			expect(savedMetadata.upToMessageId).toBe('msg-29');
		});
	});

	describe('tool-heavy conversations', () => {
		it('should ignore tool payloads and preserve user/assistant content', async () => {
			const messages: MockMessage[] = [];
			for (let i = 0; i < 40; i++) {
				if (i % 3 === 0) {
					messages.push(createMessage(`msg-${i}`, 'user', `User question ${i}`, 5000));
				} else if (i % 3 === 1) {
					messages.push(createToolMessage(`msg-${i}`));
				} else {
					messages.push(createMessage(`msg-${i}`, 'assistant', `Assistant answer ${i}`, 5000));
				}
			}
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockResolvedValue('### Goal\nGoal with tools');

			await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.5, // lower threshold since tool messages are small
			);

			const [, input] = mockGenerateCompactionSummary.mock.calls[0];
			for (const msg of input.messageBatch) {
				expect(msg.role).toMatch(/^(user|assistant)$/);
			}
		});
	});

	describe('cached summary', () => {
		it('should return cached summary when below token threshold', async () => {
			// Small messages — below threshold, but existing summary should be returned
			const messages = Array.from({ length: 25 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Short ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory({
				instanceAiConversationSummary: {
					version: 1,
					upToMessageId: 'msg-3',
					summary: 'Cached summary content',
					updatedAt: '2025-01-01T00:00:00Z',
				},
			});

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.8,
			);

			expect(result).toContain('Cached summary content');
			expect(mockGenerateCompactionSummary).not.toHaveBeenCalled();
		});
	});

	describe('failure handling', () => {
		it('should log a warning and return null when compaction generation fails', async () => {
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Msg ${i}`, 5000),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockRejectedValue(new Error('LLM timeout'));

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
				0.8,
			);

			expect(result).toBeNull();
		});
	});

	describe('context window scaling', () => {
		it('should use different context windows for different models', async () => {
			// GPT-3.5 has 16k context. 40 messages * 500 tokens = 20k + 8k overhead = 28k
			// 80% of 16k = 12.8k → 28k > 12.8k → should compact
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Msg ${i}`, 500),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockResolvedValue('### Goal\nCompacted');

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'openai/gpt-3.5-turbo',
				20,
				0.8,
			);

			// Should compact because 28k > 12.8k (80% of 16k)
			expect(result).toContain('<conversation-summary>');
			expect(mockGenerateCompactionSummary).toHaveBeenCalledTimes(1);
		});
	});
});
