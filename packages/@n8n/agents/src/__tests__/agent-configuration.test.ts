import type { LanguageModel } from 'ai';

import { Agent } from '../sdk/agent';
import type { ExecutionOptions, RunOptions } from '../types';

type WithPrivates = {
	mergeWithDefaults: (
		options?: RunOptions & ExecutionOptions,
	) => (RunOptions & ExecutionOptions) | undefined;
};

describe('Agent.configuration()', () => {
	it('does not expose an agent-wide tool approval setting', () => {
		const agent = new Agent('test');

		expect('requireToolApproval' in agent).toBe(false);
		expect(agent.snapshot).not.toHaveProperty('requireToolApproval');
	});

	it('is chainable', () => {
		const agent = new Agent('test');
		expect(agent.configuration({ maxIterations: 5 })).toBe(agent);
	});

	it('keeps native tool deferral unchanged when a snapshot is edited', () => {
		const agent = new Agent('test').nativeToolDeferral({ eagerToolNames: ['lookup'] });
		const nativeToolDeferral = agent.snapshot.nativeToolDeferral!;

		(nativeToolDeferral.eagerToolNames as string[]).push('write');
		nativeToolDeferral.eagerToolNames = [];

		expect(agent.snapshot.nativeToolDeferral).toEqual({ eagerToolNames: ['lookup'] });
	});

	it('returns undefined when no defaults and no per-call options are given', () => {
		const agent = new Agent('test');
		const result = (agent as unknown as WithPrivates).mergeWithDefaults();
		expect(result).toBeUndefined();
	});

	it('returns per-call options unchanged when no defaults are set', () => {
		const agent = new Agent('test');
		const options = { maxIterations: 10 };
		const result = (agent as unknown as WithPrivates).mergeWithDefaults(options);
		expect(result).toBe(options);
	});

	it('returns defaults when no per-call options are provided', () => {
		const agent = new Agent('test');
		agent.configuration({ maxIterations: 5 });
		const result = (agent as unknown as WithPrivates).mergeWithDefaults();
		expect(result).toEqual({ maxIterations: 5 });
	});

	it('per-call options override defaults', () => {
		const agent = new Agent('test');
		agent.configuration({ maxIterations: 5 });
		const result = (agent as unknown as WithPrivates).mergeWithDefaults({ maxIterations: 10 });
		expect(result?.maxIterations).toBe(10);
	});

	it('preserves default fields not present in the per-call options', () => {
		const controller = new AbortController();
		const agent = new Agent('test');
		agent.configuration({ maxIterations: 5, abortSignal: controller.signal });
		const result = (agent as unknown as WithPrivates).mergeWithDefaults({ maxIterations: 10 });
		expect(result?.maxIterations).toBe(10);
		expect(result?.abortSignal).toBe(controller.signal);
	});

	it('last call to configuration() replaces the previous defaults', () => {
		const agent = new Agent('test');
		agent.configuration({ maxIterations: 5 });
		agent.configuration({ maxIterations: 20 });
		const result = (agent as unknown as WithPrivates).mergeWithDefaults();
		expect(result?.maxIterations).toBe(20);
	});
});

describe('Agent.snapshot model', () => {
	// The shape of an AI SDK model instance, as an AI service proxy builds it.
	function prebuiltModel(provider: string, modelId: string) {
		return {
			specificationVersion: 'v2',
			provider,
			modelId,
			supportedUrls: {},
			doGenerate: vi.fn(),
			doStream: vi.fn(),
		} as unknown as LanguageModel;
	}

	it('reads the provider and name of a model id', () => {
		const agent = new Agent('test').model('anthropic/claude-opus-5-5');

		expect(agent.snapshot.model).toEqual({ provider: 'anthropic', name: 'claude-opus-5-5' });
	});

	it('reads the provider and name of a model config', () => {
		const agent = new Agent('test').model({ id: 'openai/gpt-5.4', apiKey: 'key' });

		expect(agent.snapshot.model).toEqual({ provider: 'openai', name: 'gpt-5.4' });
	});

	it.each([
		['anthropic.messages', 'claude-opus-5-5', 'anthropic'],
		['moonshotai.chat', 'kimi-k3', 'moonshotai'],
	])('reads the provider of a pre-built %s model', (provider, modelId, expected) => {
		const agent = new Agent('test').model(prebuiltModel(provider, modelId));

		expect(agent.snapshot.model).toEqual({ provider: expected, name: modelId });
	});
});
