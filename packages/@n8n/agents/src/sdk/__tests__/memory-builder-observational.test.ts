import type { BuiltMemory } from '../../types';
import { Agent } from '../agent';
import { Memory } from '../memory';

describe('Memory builder — observation log memory', () => {
	it('omits observationalMemory when not configured', () => {
		const config = new Memory().build();
		expect(config.observationalMemory).toBeUndefined();
		expect(config.observationLog).toBeUndefined();
	});

	it('configures observation-log memory', () => {
		const config = new Memory()
			.observationalMemory({
				observerThresholdTokens: 8_000,
				reflectorThresholdTokens: 24_000,
				renderTokenBudget: 8_000,
				observationLogTailLimit: 20,
				lockTtlMs: 30_000,
			})
			.build();

		expect(config.observationLog).toEqual({ renderTokenBudget: 8_000 });
		expect(config.observationalMemory).toMatchObject({
			observerThresholdTokens: 8_000,
			reflectorThresholdTokens: 24_000,
			observationLogTailLimit: 20,
			lockTtlMs: 30_000,
		});
	});

	it('rejects backends that do not implement the observation-log store', () => {
		const minimalBackend = {
			getThread: jest.fn().mockResolvedValue(null),
			saveThread: jest.fn().mockResolvedValue({}),
			deleteThread: jest.fn().mockResolvedValue(undefined),
			getMessages: jest.fn().mockResolvedValue([]),
			saveMessages: jest.fn().mockResolvedValue(undefined),
			deleteMessages: jest.fn().mockResolvedValue(undefined),
			describe: () => ({
				name: 'minimal',
				constructorName: 'MinimalMemory',
				connectionParams: null,
			}),
		} as unknown as BuiltMemory;

		expect(() => new Memory().storage(minimalBackend).observationalMemory().build()).toThrow(
			/BuiltObservationLogStore/,
		);
	});

	describe('agent.snapshot.hasObservationalMemory', () => {
		it('is false when no memory is configured', () => {
			const agent = new Agent('a').model('openai/gpt-4o-mini');
			expect(agent.snapshot.hasObservationalMemory).toBe(false);
		});

		it('is false when memory is configured without observational block', () => {
			const memory = new Memory();
			const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
			expect(agent.snapshot.hasObservationalMemory).toBe(false);
		});

		it('is true when observation-log memory is configured', () => {
			const memory = new Memory().observationalMemory();
			const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
			expect(agent.snapshot.hasObservationalMemory).toBe(true);
		});
	});
});
