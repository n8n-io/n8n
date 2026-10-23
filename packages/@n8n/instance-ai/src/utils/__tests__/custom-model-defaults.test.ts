import {
	parseReasoningEffort,
	parseSupportsStructuredOutputs,
	resolveCustomModelExperimentDefaults,
	resolveCustomModelExperimentDefaultsFromEnv,
} from '../custom-model-defaults';

describe('resolveCustomModelExperimentDefaults', () => {
	it('maps known Kimi K3 models to low effort and structured outputs', () => {
		expect(resolveCustomModelExperimentDefaults('custom/moonshotai/Kimi-K3')).toEqual({
			reasoningEffort: 'low',
			supportsStructuredOutputs: true,
		});
		expect(resolveCustomModelExperimentDefaults('moonshotai/kimi-k3')).toEqual({
			reasoningEffort: 'low',
			supportsStructuredOutputs: true,
		});
	});

	it('maps GLM 5.2 models to medium effort', () => {
		expect(resolveCustomModelExperimentDefaults('custom/zai-org/GLM-5.2-Fast')).toEqual({
			reasoningEffort: 'medium',
			supportsStructuredOutputs: true,
		});
	});

	it('maps DeepSeek models to structured outputs only', () => {
		expect(resolveCustomModelExperimentDefaults('custom/deepseek-ai/DeepSeek-V4-Pro')).toEqual({
			supportsStructuredOutputs: true,
		});
	});

	it('returns nothing for unknown custom models', () => {
		expect(resolveCustomModelExperimentDefaults('custom/unknown-model')).toEqual({});
	});

	it('lets explicit overrides win over the model map', () => {
		expect(
			resolveCustomModelExperimentDefaults('custom/moonshotai/Kimi-K3', {
				reasoningEffort: 'high',
				supportsStructuredOutputs: false,
			}),
		).toEqual({
			reasoningEffort: 'high',
			supportsStructuredOutputs: false,
		});
	});
});

describe('resolveCustomModelExperimentDefaultsFromEnv', () => {
	const previousEffort = process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
	const previousStructured = process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS;

	afterEach(() => {
		if (previousEffort === undefined) delete process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
		else process.env.N8N_INSTANCE_AI_REASONING_EFFORT = previousEffort;
		if (previousStructured === undefined) {
			delete process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS;
		} else {
			process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS = previousStructured;
		}
	});

	it('reads env overrides ahead of the model map', () => {
		process.env.N8N_INSTANCE_AI_REASONING_EFFORT = 'high';
		process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS = 'false';
		expect(resolveCustomModelExperimentDefaultsFromEnv('custom/moonshotai/Kimi-K3')).toEqual({
			reasoningEffort: 'high',
			supportsStructuredOutputs: false,
		});
	});

	it('falls back to the model map when env is unset', () => {
		delete process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
		delete process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS;
		expect(resolveCustomModelExperimentDefaultsFromEnv('custom/moonshotai/Kimi-K3')).toEqual({
			reasoningEffort: 'low',
			supportsStructuredOutputs: true,
		});
	});

	it('falls back to the model map when env overrides are non-empty but invalid', () => {
		process.env.N8N_INSTANCE_AI_REASONING_EFFORT = 'nope';
		process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS = 'maybe';

		expect(resolveCustomModelExperimentDefaultsFromEnv('custom/moonshotai/Kimi-K3')).toEqual({
			reasoningEffort: 'low',
			supportsStructuredOutputs: true,
		});
	});
});

describe('parse helpers', () => {
	it('parses reasoning effort values', () => {
		expect(parseReasoningEffort(' medium ')).toBe('medium');
		expect(parseReasoningEffort('')).toBeUndefined();
		expect(parseReasoningEffort('nope')).toBeUndefined();
	});

	it('parses structured-output flags', () => {
		expect(parseSupportsStructuredOutputs('true')).toBe(true);
		expect(parseSupportsStructuredOutputs('0')).toBe(false);
		expect(parseSupportsStructuredOutputs('')).toBeUndefined();
		expect(parseSupportsStructuredOutputs('maybe')).toBeUndefined();
	});
});
