import type * as AiImport from 'ai';

import type { ModelConfig } from '../../types';
import {
	createEpisodicMemoryExtractFn,
	createEpisodicMemoryReflectFn,
} from '../memory/episodic-memory-defaults';

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

type GenerateTextResult = { output: unknown; usage?: { totalTokens?: number } };

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

	it('rejects extracted entries without source evidence', async () => {
		mockGenerateText.mockImplementation(async ({ output }) => {
			const parsedOutput = output.schema.parse({
				entries: [
					{
						content: 'User chose Postgres for the memory store.',
						sources: [],
					},
				],
			});
			return await Promise.resolve({ output: parsedOutput });
		});

		await expect(
			createEpisodicMemoryExtractFn(fakeModel)({
				scope: { resourceId: 'user-1' },
				now: new Date('2026-05-12T15:00:00.000Z'),
				candidates: [],
				renderedCandidates: '',
				existingEntries: [],
			}),
		).rejects.toThrow();
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
			return await Promise.resolve({ output: parsedOutput });
		});

		await expect(
			createEpisodicMemoryReflectFn(fakeModel)({
				scope: { resourceId: 'user-1' },
				now: new Date('2026-05-12T15:00:00.000Z'),
				seedEntryIds: [],
				entries: [],
				sources: [],
			}),
		).rejects.toThrow();
	});

	it('counts extraction and reflection generation tokens when usage is available', async () => {
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			const parsedOutput = output.schema.parse({ entries: [] });
			return await Promise.resolve({ output: parsedOutput, usage: { totalTokens: 11 } });
		});

		await createEpisodicMemoryExtractFn(fakeModel)({
			scope: { resourceId: 'user-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			candidates: [],
			renderedCandidates: '',
			existingEntries: [],
			executionCounter: counter,
		});

		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			const parsedOutput = output.schema.parse({ drop: [], merge: [] });
			return await Promise.resolve({ output: parsedOutput, usage: { totalTokens: 13 } });
		});

		await createEpisodicMemoryReflectFn(fakeModel)({
			scope: { resourceId: 'user-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
			executionCounter: counter,
		});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(11);
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(13);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});
});
