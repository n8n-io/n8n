import type { AgentRuntimeConfig } from '../../runtime/agent-runtime';
import { InMemoryMemory } from '../../runtime/memory-store';
import type { BuiltMemory, MemoryConfig } from '../../types';
import { Agent } from '../agent';
import {
	DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS,
	DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET,
	Memory,
	resolveMemoryConfigDefaults,
	resolveObservationalMemoryConfig,
} from '../memory';

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

	it('allows observer callbacks to use SDK default thresholds', () => {
		const observe = async () => await Promise.resolve('');
		const config = new Memory()
			.observationalMemory({
				observe,
			})
			.build();

		expect(config.observationalMemory?.observe).toBe(observe);
		expect(config.observationalMemory?.observerThresholdTokens).toBeUndefined();
	});

	it('allows reflector callbacks to use SDK default thresholds', () => {
		const reflect = async () => await Promise.resolve('{"drop":[],"merge":[]}');
		const config = new Memory()
			.observationalMemory({
				reflect,
			})
			.build();

		expect(config.observationalMemory?.reflect).toBe(reflect);
		expect(config.observationalMemory?.reflectorThresholdTokens).toBeUndefined();
	});

	it('resolves observational memory defaults from the agent model', () => {
		const resolved = resolveObservationalMemoryConfig({}, { defaultModel: 'openai/gpt-4o-mini' });

		expect(resolved).toMatchObject({
			observerThresholdTokens: 500,
			reflectorThresholdTokens: 4_000,
			renderTokenBudget: DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET,
			observationLogTailLimit: 20,
			lockTtlMs: DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS,
		});
		expect(typeof resolved.observe).toBe('function');
		expect(typeof resolved.reflect).toBe('function');
	});

	it('preserves observational memory overrides when resolving defaults', () => {
		const observe = async () => await Promise.resolve('');
		const reflect = async () => await Promise.resolve('{"drop":[],"merge":[]}');
		const resolved = resolveObservationalMemoryConfig(
			{
				observerThresholdTokens: 123,
				reflectorThresholdTokens: 456,
				renderTokenBudget: 789,
				observationLogTailLimit: 3,
				lockTtlMs: 1_000,
				observe,
				reflect,
			},
			{ defaultModel: 'openai/gpt-4o-mini' },
		);

		expect(resolved).toMatchObject({
			observerThresholdTokens: 123,
			reflectorThresholdTokens: 456,
			renderTokenBudget: 789,
			observationLogTailLimit: 3,
			lockTtlMs: 1_000,
		});
		expect(resolved.observe).toBe(observe);
		expect(resolved.reflect).toBe(reflect);
	});

	it('preserves explicit observation-log render budget when resolving defaults', () => {
		const resolved = resolveMemoryConfigDefaults(
			{
				memory: new InMemoryMemory(),
				observationLog: { renderTokenBudget: 123 },
				observationalMemory: {},
			} as MemoryConfig,
			{ defaultModel: 'openai/gpt-4o-mini' },
		);

		expect(resolved.observationLog).toEqual({ renderTokenBudget: 123 });
		expect(resolved.observationalMemory?.renderTokenBudget).toBe(123);
	});

	it('lets explicit observational render budget override observation-log render budget', () => {
		const resolved = resolveMemoryConfigDefaults(
			{
				memory: new InMemoryMemory(),
				observationLog: { renderTokenBudget: 123 },
				observationalMemory: { renderTokenBudget: 456 },
			} as MemoryConfig,
			{ defaultModel: 'openai/gpt-4o-mini' },
		);

		expect(resolved.observationLog).toEqual({ renderTokenBudget: 456 });
		expect(resolved.observationalMemory?.renderTokenBudget).toBe(456);
	});

	it('passes resolved observational memory config into the runtime', async () => {
		const memory = new Memory().storage(new InMemoryMemory()).observationalMemory();
		const agent = new Agent('a')
			.model('openai/gpt-4o-mini')
			.instructions('You are a test assistant.')
			.memory(memory);

		const runtimeConfig = await (
			agent as unknown as { build(): Promise<AgentRuntimeConfig> }
		).build();

		expect(runtimeConfig.observationLog).toEqual({
			renderTokenBudget: DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET,
		});
		expect(runtimeConfig.observationalMemory).toMatchObject({
			observerThresholdTokens: 500,
			reflectorThresholdTokens: 4_000,
		});
		expect(typeof runtimeConfig.observationalMemory?.observe).toBe('function');
		expect(typeof runtimeConfig.observationalMemory?.reflect).toBe('function');
	});

	it('rejects backends that do not implement the observation-log store', () => {
		const minimalBackend = {
			getThread: vi.fn().mockResolvedValue(null),
			saveThread: vi.fn().mockResolvedValue({}),
			deleteThread: vi.fn().mockResolvedValue(undefined),
			getMessages: vi.fn().mockResolvedValue([]),
			saveMessages: vi.fn().mockResolvedValue(undefined),
			deleteMessages: vi.fn().mockResolvedValue(undefined),
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
