// Manual mock — must be declared before any imports that touch the mocked module.
// We mock @n8n/instance-ai (which compaction.service.ts imports from) so Jest
// doesn't try to resolve the workspace package's dist/ (which may not be built).
const mockGenerateCompactionSummary = jest.fn();
jest.mock('@n8n/instance-ai', () => ({
	generateCompactionSummary: (...args: unknown[]) => mockGenerateCompactionSummary(...args),
}));

// Mock Mastra imports that compaction.service.ts and its transitive deps use.
// TypeORMMemoryStorage extends MemoryStorage, so we must provide a real class.
jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class MemoryStorage {},
	MastraCompositeStore: class MastraCompositeStore {},
}));
jest.mock('@mastra/memory', () => ({}));

// Now safe to import — all external deps are mocked
import { InstanceAiCompactionService } from '../compaction.service';

interface MockMessage {
	id: string;
	role: string;
	content: unknown;
	createdAt: Date;
	threadId: string;
}

function createMessage(id: string, role: 'user' | 'assistant', text: string): MockMessage {
	return {
		id,
		role,
		content: { content: [{ type: 'text', text }] },
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

function createService(messages: MockMessage[]): InstanceAiCompactionService {
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
	return new InstanceAiCompactionService(mockLogger as never, mockStorage as never);
}

describe('InstanceAiCompactionService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('thread below threshold', () => {
		it('should not create or update summary when thread has fewer messages than lastMessages', async () => {
			const messages = Array.from({ length: 10 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
			);

			expect(result).toBeNull();
			expect(mockGenerateCompactionSummary).not.toHaveBeenCalled();
			expect(memory.updateThread).not.toHaveBeenCalled();
		});
	});

	describe('first compaction', () => {
		it('should create a summary, advance upToMessageId, and leave raw messages untouched', async () => {
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockResolvedValue('### Goal\nTest goal');

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
			);

			// Should return formatted summary block
			expect(result).toContain('<conversation-summary>');
			expect(result).toContain('### Goal');
			expect(result).toContain('</conversation-summary>');

			// Should call the compaction helper with no previous summary
			expect(mockGenerateCompactionSummary).toHaveBeenCalledTimes(1);
			const [modelId, input] = mockGenerateCompactionSummary.mock.calls[0];
			expect(modelId).toBe('anthropic/claude-sonnet-4-5');
			expect(input.previousSummary).toBeNull();
			expect(input.messageBatch.length).toBeGreaterThan(0);

			// Should persist metadata with upToMessageId = last message in prefix
			expect(memory.updateThread).toHaveBeenCalledTimes(1);
			const updateCall = memory.updateThread.mock.calls[0][0];
			const savedMetadata = updateCall.metadata.instanceAiConversationSummary;
			expect(savedMetadata.version).toBe(1);
			expect(savedMetadata.upToMessageId).toBe('msg-19'); // prefix end = 40 - 20 = index 19
			expect(savedMetadata.summary).toBe('### Goal\nTest goal');
		});
	});

	describe('incremental compaction', () => {
		it('should only summarize the delta after the stored upToMessageId', async () => {
			const messages = Array.from({ length: 50 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
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
			);

			// Should pass previous summary for merging
			const [, input] = mockGenerateCompactionSummary.mock.calls[0];
			expect(input.previousSummary).toBe('Previous summary content');

			// Should advance upToMessageId to end of new prefix
			const updateCall = memory.updateThread.mock.calls[0][0];
			const savedMetadata = updateCall.metadata.instanceAiConversationSummary;
			expect(savedMetadata.version).toBe(2);
			expect(savedMetadata.upToMessageId).toBe('msg-29'); // prefix end = 50 - 20 = index 29
		});
	});

	describe('tool-heavy conversations', () => {
		it('should ignore tool payloads and preserve user/assistant content', async () => {
			const messages: MockMessage[] = [];
			for (let i = 0; i < 40; i++) {
				if (i % 3 === 0) {
					messages.push(createMessage(`msg-${i}`, 'user', `User question ${i}`));
				} else if (i % 3 === 1) {
					messages.push(createToolMessage(`msg-${i}`));
				} else {
					messages.push(createMessage(`msg-${i}`, 'assistant', `Assistant answer ${i}`));
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
			);

			// The message batch should only contain user and assistant messages
			const [, input] = mockGenerateCompactionSummary.mock.calls[0];
			for (const msg of input.messageBatch) {
				expect(msg.role).toMatch(/^(user|assistant)$/);
			}
		});
	});

	describe('cached summary', () => {
		it('should return cached summary when unsummarized delta is below threshold', async () => {
			const messages = Array.from({ length: 25 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
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
			);

			// Should return the cached summary without regenerating
			expect(result).toContain('<conversation-summary>');
			expect(result).toContain('Cached summary content');
			expect(mockGenerateCompactionSummary).not.toHaveBeenCalled();
			expect(memory.updateThread).not.toHaveBeenCalled();
		});
	});

	describe('failure handling', () => {
		it('should log a warning and return null when compaction generation fails', async () => {
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockRejectedValue(new Error('LLM timeout'));

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
			);

			expect(result).toBeNull();
		});
	});

	describe('message input composition', () => {
		it('should format the summary block with conversation-summary tags', async () => {
			const messages = Array.from({ length: 40 }, (_, i) =>
				createMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
			);
			const service = createService(messages);
			const memory = createMockMemory();

			mockGenerateCompactionSummary.mockResolvedValue(
				'### Goal\nBuild a workflow\n\n### Important facts and decisions\n- Using Gmail',
			);

			const result = await service.prepareCompactedContext(
				'thread-1',
				memory as never,
				'anthropic/claude-sonnet-4-5',
				20,
			);

			expect(result).toBe(
				'<conversation-summary>\n### Goal\nBuild a workflow\n\n### Important facts and decisions\n- Using Gmail\n</conversation-summary>',
			);
		});
	});
});
