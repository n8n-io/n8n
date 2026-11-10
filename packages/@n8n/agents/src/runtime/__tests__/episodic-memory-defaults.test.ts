import type * as AiImport from 'ai';

import type { ModelConfig } from '../../types';
import {
	buildEpisodicMemoryConsolidatorPrompt,
	createEpisodicMemoryConsolidateFn,
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

const consolidatorInput = {
	scope: { resourceId: 'user-1', threadId: 'thread-1' },
	now: new Date('2026-05-12T15:00:00.000Z'),
	facts: [
		{
			candidateId: 'candidate-1',
			content: 'Acme renewal moved to 15 March.',
			evidenceText: 'the renewal is now on March 15',
			createdAt: new Date('2026-05-12T14:00:00.000Z'),
			neighbours: [
				{
					id: 'entry-1',
					content: 'Acme renewal is on 1 March.',
					createdAt: new Date('2026-04-01T10:00:00.000Z'),
					lastSeenAt: new Date('2026-04-20T10:00:00.000Z'),
					evidenceText: 'renewal is March 1',
				},
			],
		},
	],
};

describe('episodic memory defaults', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('renders each new fact with its stored neighbours and their newest evidence', () => {
		expect(buildEpisodicMemoryConsolidatorPrompt(consolidatorInput)).toBe(
			[
				'Current timestamp: 2026-05-12T15:00:00.000Z',
				'',
				'New memory [candidate-1] (stored 2026-05-12): Acme renewal moved to 15 March.',
				'  Evidence: the renewal is now on March 15',
				'Stored memories:',
				'- [entry-1] (stored 2026-04-01, last seen 2026-04-20): Acme renewal is on 1 March.',
				'  Evidence: renewal is March 1',
			].join('\n'),
		);
	});

	it('rejects a relation outside duplicate, update, and different', async () => {
		mockGenerateText.mockImplementation(async ({ output }) => {
			const parsedOutput = output.schema.parse({
				facts: [
					{
						candidateId: 'candidate-1',
						relations: [{ entryId: 'entry-1', reason: 'Same renewal.', relation: 'merge' }],
						mergedContent: null,
					},
				],
			});
			return await Promise.resolve({
				output: parsedOutput,
				finalStep: { providerMetadata: undefined },
			});
		});

		await expect(createEpisodicMemoryConsolidateFn(fakeModel)(consolidatorInput)).rejects.toThrow();
	});

	it('counts consolidation generation tokens when usage is available', async () => {
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const consolidation = {
			facts: [
				{
					candidateId: 'candidate-1',
					relations: [{ entryId: 'entry-1', reason: 'Same renewal date.', relation: 'update' }],
					mergedContent: 'Acme renewal is on 15 March.',
				},
			],
		};
		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			const parsedOutput = output.schema.parse(consolidation);
			return await Promise.resolve({
				output: parsedOutput,
				usage: { totalTokens: 13 },
				finalStep: { providerMetadata: undefined },
			});
		});

		const result = await createEpisodicMemoryConsolidateFn(fakeModel)({
			...consolidatorInput,
			executionCounter: counter,
		});

		expect(result.consolidation).toEqual(consolidation);
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(13);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});
});
