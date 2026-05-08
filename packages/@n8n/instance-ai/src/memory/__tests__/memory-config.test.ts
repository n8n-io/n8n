// Mock Mastra Memory to inspect constructor args
const mockConstructor = jest.fn();
jest.mock('@mastra/memory', () => ({
	Memory: class MockMemory {
		constructor(config: unknown) {
			mockConstructor(config);
		}
	},
}));

import type { InstanceAiMemoryConfig } from '../../types';
import { createMemory } from '../memory-config';

interface MemoryArgs {
	storage: unknown;
	options: {
		lastMessages: number;
		semanticRecall: false | { topK: number };
		generateTitle: boolean;
		workingMemory: { enabled: boolean; template?: string };
	};
	embedder?: string;
}

function getLastCallArgs(): MemoryArgs {
	const calls = mockConstructor.mock.calls as unknown[][];
	const lastCall = calls[calls.length - 1];
	return lastCall[0] as MemoryArgs;
}

describe('createMemory', () => {
	const baseConfig: InstanceAiMemoryConfig = {
		storage: {} as InstanceAiMemoryConfig['storage'],
		lastMessages: 20,
	};

	beforeEach(() => mockConstructor.mockClear());

	it('disables semantic recall when embedderModel is absent', () => {
		createMemory(baseConfig);

		const args = getLastCallArgs();
		expect(args.options.semanticRecall).toBe(false);
		expect(args.embedder).toBeUndefined();
	});

	it('disables semantic recall when only embedderModel is set (no topK)', () => {
		createMemory({ ...baseConfig, embedderModel: 'openai/text-embedding-3-small' });

		const args = getLastCallArgs();
		expect(args.options.semanticRecall).toBe(false);
	});

	it('enables semantic recall when both embedderModel and semanticRecallTopK are set', () => {
		createMemory({
			...baseConfig,
			embedderModel: 'openai/text-embedding-3-small',
			semanticRecallTopK: 5,
		});

		const args = getLastCallArgs();
		expect(args.options.semanticRecall).toEqual({ topK: 5 });
		expect(args.embedder).toBe('openai/text-embedding-3-small');
	});

	it('disables Mastra title generation (titles are managed by n8n)', () => {
		createMemory(baseConfig);

		const args = getLastCallArgs();
		expect(args.options.generateTitle).toBe(false);
	});
});
