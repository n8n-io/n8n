import type { AgentRuntimeConfig } from '../../runtime/loop/agent-runtime';
import { createEpisodicMemoryReflectFn } from '../../runtime/memory/episodic-memory-defaults';
import { InMemoryMemory } from '../../runtime/memory/memory-store';
import {
	createObservationLogObserveFn,
	createObservationLogReflectFn,
} from '../../runtime/memory/observation-log-defaults';
import { Agent } from '../agent';
import { Memory } from '../memory';

vi.mock('../../runtime/memory/episodic-memory-defaults', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../runtime/memory/episodic-memory-defaults')>();
	return { ...actual, createEpisodicMemoryReflectFn: vi.fn(actual.createEpisodicMemoryReflectFn) };
});
vi.mock('../../runtime/memory/observation-log-defaults', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../runtime/memory/observation-log-defaults')>();
	return {
		...actual,
		createObservationLogObserveFn: vi.fn(actual.createObservationLogObserveFn),
		createObservationLogReflectFn: vi.fn(actual.createObservationLogReflectFn),
	};
});

describe('memory worker model fetch', () => {
	it('gives the default memory workers the agent model fetch', async () => {
		const modelFetch = vi.fn();
		const memory = new Memory()
			.storage(new InMemoryMemory())
			.observationalMemory()
			.episodicMemory({ embeddingProviderOptions: 'test-key' });
		const agent = new Agent('a')
			.model('openai/gpt-4o-mini')
			.instructions('You are a test assistant.')
			.modelFetch(modelFetch)
			.memory(memory);

		await (agent as unknown as { build(): Promise<AgentRuntimeConfig> }).build();

		const withFetch = expect.objectContaining({ modelFetch });
		expect(createObservationLogObserveFn).toHaveBeenCalledWith('openai/gpt-4o-mini', withFetch);
		expect(createObservationLogReflectFn).toHaveBeenCalledWith('openai/gpt-4o-mini', withFetch);
		expect(createEpisodicMemoryReflectFn).toHaveBeenCalledWith('openai/gpt-4o-mini', withFetch);
	});
});
