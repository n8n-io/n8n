import type * as AiImport from 'ai';

import type { ModelConfig } from '../../types';
import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT,
	DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
	buildEpisodicMemoryExtractorPrompt,
	buildEpisodicMemoryReflectorPrompt,
	createEpisodicMemoryExtractFn,
	createEpisodicMemoryReflectFn,
} from '../episodic-memory-defaults';

type GenerateObjectCall = {
	schema: {
		parse(value: unknown): unknown;
	};
};

type GenerateObjectResult = { object: unknown; usage?: { totalTokens?: number } };

const mockGenerateObject = jest.fn<Promise<GenerateObjectResult>, [GenerateObjectCall]>();

jest.mock('ai', () => {
	const actual = jest.requireActual<typeof AiImport>('ai');
	return {
		...actual,
		generateObject: async (call: GenerateObjectCall): Promise<GenerateObjectResult> =>
			await mockGenerateObject(call),
	};
});

const fakeModel = { doGenerate: jest.fn() } as unknown as ModelConfig;

describe('episodic memory defaults', () => {
	beforeEach(() => {
		mockGenerateObject.mockReset();
	});

	it('defines the default extraction and reflection policy', () => {
		expect(DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL).toBe('openai/text-embedding-3-small');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"sources"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"observationId"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'Only store assistant-proposed material when the user adopts',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).not.toContain('supersedes');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"drop"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"merge"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Similar but distinct');
	});

	it('builds extractor and reflector prompts from runtime inputs', () => {
		const now = new Date('2026-05-12T15:00:00.000Z');
		const createdAt = new Date('2026-05-12T14:30:00.000Z');
		const entry = {
			id: 'mem-1',
			resourceId: 'user-1',
			content: 'User planned SQLite for local-first memory storage.',
			contentHash: 'hash-1',
			status: 'active' as const,
			supersededBy: null,
			metadata: null,
			createdAt,
			updatedAt: createdAt,
			lastSeenAt: createdAt,
			lexicalScore: 1,
			vectorScore: 1,
			rrfScore: 1,
			finalScore: 1,
		};

		const extractorPrompt = buildEpisodicMemoryExtractorPrompt({
			scope: { resourceId: 'user-1' },
			observationScope: {
				observationScopeId: 'thread-1',
			},
			now,
			observations: [
				{
					id: 'obs-1',
					observationScopeId: 'thread-1',
					marker: 'critical',
					text: 'User switched memory store choice to Postgres.',
					parentId: null,
					tokenCount: 12,
					status: 'active',
					supersededBy: null,
					createdAt,
				},
			],
			renderedObservations: '',
			existingEntries: [entry],
		});
		const reflectorPrompt = buildEpisodicMemoryReflectorPrompt({
			scope: { resourceId: 'user-1' },
			now,
			seedEntryIds: ['mem-1'],
			entries: [entry],
			sources: [
				{
					id: 'source-1',
					memoryEntryId: 'mem-1',
					observationId: 'obs-1',
					threadId: 'thread-1',
					evidenceText: 'User planned SQLite',
					createdAt,
				},
			],
		});

		expect(extractorPrompt).toContain('Scope: resource:user-1');
		expect(extractorPrompt).toContain('[obs-1] CRITICAL 2026-05-12T14:30:00.000Z');
		expect(extractorPrompt).toContain(
			'[mem-1] User planned SQLite for local-first memory storage.',
		);
		expect(reflectorPrompt).toContain('Seed entry IDs: mem-1');
		expect(reflectorPrompt).toContain('source observation obs-1');
		expect(reflectorPrompt).toContain('User planned SQLite');
	});

	it('rejects extracted entries without source evidence', async () => {
		mockGenerateObject.mockImplementation(async ({ schema }) => {
			const object = schema.parse({
				entries: [
					{
						content: 'User chose Postgres for the memory store.',
						sources: [],
					},
				],
			});
			return await Promise.resolve({ object });
		});

		await expect(
			createEpisodicMemoryExtractFn(fakeModel)({
				scope: { resourceId: 'user-1' },
				observationScope: {
					observationScopeId: 'thread-1',
				},
				now: new Date('2026-05-12T15:00:00.000Z'),
				observations: [],
				renderedObservations: '',
				existingEntries: [],
			}),
		).rejects.toThrow();
	});

	it('rejects reflection merges without superseded entry IDs', async () => {
		mockGenerateObject.mockImplementation(async ({ schema }) => {
			const object = schema.parse({
				drop: [],
				merge: [
					{
						supersedes: [],
						content: 'User chose Postgres for the memory store.',
					},
				],
			});
			return await Promise.resolve({ object });
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
			incrementMessageCount: jest.fn(),
			incrementToolCallCount: jest.fn(),
			incrementTokenCount: jest.fn(),
		};

		mockGenerateObject.mockImplementationOnce(async ({ schema }) => {
			const object = schema.parse({ entries: [] });
			return await Promise.resolve({ object, usage: { totalTokens: 11 } });
		});

		await createEpisodicMemoryExtractFn(fakeModel)({
			scope: { resourceId: 'user-1' },
			observationScope: { observationScopeId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			observations: [],
			renderedObservations: '',
			existingEntries: [],
			executionCounter: counter,
		});

		mockGenerateObject.mockImplementationOnce(async ({ schema }) => {
			const object = schema.parse({ drop: [], merge: [] });
			return await Promise.resolve({ object, usage: { totalTokens: 13 } });
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
