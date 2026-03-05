/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { Memory } from '../memory';

const mockSetVector = jest.fn();
const mockSetEmbedder = jest.fn();

jest.mock('@mastra/memory', () => ({
	Memory: jest.fn().mockImplementation((config: unknown) => ({
		__isMastraMemory: true,
		config,
		setVector: mockSetVector,
		setEmbedder: mockSetEmbedder,
	})),
}));

jest.mock('@mastra/core/storage', () => ({
	InMemoryStore: jest.fn().mockImplementation(() => ({
		__isInMemoryStore: true,
	})),
}));

const mockVectorStore = { __isMastraVector: true } as any;
const mockExternalStore = { __isExternalStore: true } as any;

describe('Memory', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should build with in-memory storage', () => {
		const memory = new Memory().storage('memory').lastMessages(20).build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
	});

	it('should build with a custom storage provider', () => {
		const memory = new Memory().storage(mockExternalStore).lastMessages(20).build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
	});

	it('should throw if no storage is configured', () => {
		expect(() => new Memory().lastMessages(20).build()).toThrow('requires a storage provider');
	});

	it('should build with semantic recall and vector store', () => {
		const memory = new Memory()
			.storage('memory')
			.lastMessages(20)
			.semanticRecall({ topK: 4, messageRange: { before: 1, after: 1 } })
			.vectorStore(mockVectorStore, 'openai/text-embedding-3-small')
			.build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
		expect(mockSetVector).toHaveBeenCalledWith(mockVectorStore);
		expect(mockSetEmbedder).toHaveBeenCalledWith('openai/text-embedding-3-small');
	});

	it('should throw if semantic recall is used without vector store', () => {
		expect(() =>
			new Memory().storage('memory').lastMessages(20).semanticRecall({ topK: 4 }).build(),
		).toThrow('requires a vector store');
	});

	it('should build with working memory', () => {
		const schema = z.object({
			name: z.string().optional(),
			preferences: z.record(z.string()).optional(),
		});
		const memory = new Memory().storage('memory').lastMessages(10).workingMemory(schema).build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
	});

	it('should build with all options', () => {
		const memory = new Memory()
			.storage('memory')
			.lastMessages(20)
			.semanticRecall({ topK: 4 })
			.vectorStore(mockVectorStore, 'openai/text-embedding-3-small')
			.workingMemory(z.object({ name: z.string().optional() }))
			.build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
	});

	it('should default lastMessages to 10', () => {
		const memory = new Memory().storage('memory').build();
		expect(memory).toBeDefined();
		expect(memory._mastraMemory).toBeDefined();
	});
});
