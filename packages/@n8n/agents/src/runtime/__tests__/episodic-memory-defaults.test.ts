import type * as AiImport from 'ai';

import type { ModelConfig } from '../../types';
import { createEpisodicMemoryReflectFn } from '../memory/episodic-memory-defaults';

type GenerateTextCall = {
	output: {
		schema: {
			parse(value: unknown): unknown;
		};
	};
};

type OutputObjectOptions = {
	schema: {
		parse(value: unknown): unknown;
	};
};

type GenerateTextResult = {
	output: unknown;
	usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
	finalStep: { providerMetadata?: Record<string, Record<string, number>> };
};

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(...args: [GenerateTextCall]) => Promise<GenerateTextResult>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		Output: {
			...actual.Output,
			object: ({ schema }: OutputObjectOptions) => ({ schema }),
		},
		generateText: async (call: GenerateTextCall): Promise<GenerateTextResult> =>
			await mockGenerateText(call),
	};
});

const fakeModel = { doGenerate: vi.fn() } as unknown as ModelConfig;

describe('episodic memory defaults', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('rejects reflection merges without superseded entry IDs', async () => {
		mockGenerateText.mockImplementation(async ({ output }) => {
			const parsedOutput = output.schema.parse({
				drop: [],
				merge: [
					{
						supersedes: [],
						content: 'User chose Postgres for the memory store.',
					},
				],
			});
			return await Promise.resolve({ output: parsedOutput, finalStep: {} });
		});

		await expect(
			createEpisodicMemoryReflectFn(fakeModel)({
				scope: { resourceId: 'user-1', threadId: 'thread-1' },
				now: new Date('2026-05-12T15:00:00.000Z'),
				seedEntryIds: [],
				entries: [],
				sources: [],
			}),
		).rejects.toThrow();
	});

	it('counts reflection generation tokens when usage is available', async () => {
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			const parsedOutput = output.schema.parse({ drop: [], merge: [] });
			return await Promise.resolve({
				output: parsedOutput,
				usage: { totalTokens: 13 },
				finalStep: {},
			});
		});

		await createEpisodicMemoryReflectFn(fakeModel)({
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
			executionCounter: counter,
		});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(13);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});

	it('uses final-step metadata to report cached tokens', async () => {
		mockGenerateText.mockImplementationOnce(async ({ output }) => ({
			output: output.schema.parse({ drop: [], merge: [] }),
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
			finalStep: { providerMetadata: { openai: { cachedPromptTokens: 30 } } },
		}));

		const result = await createEpisodicMemoryReflectFn(fakeModel)({
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
		});

		expect(result).toHaveProperty('usage', {
			promptTokens: 100,
			completionTokens: 50,
			totalTokens: 150,
			inputTokenDetails: { noCache: 70, cacheRead: 30 },
		});
	});
});
