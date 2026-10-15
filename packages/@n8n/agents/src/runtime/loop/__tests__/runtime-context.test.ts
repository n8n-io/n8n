import type { ModelConfig } from '../../../types/sdk/agent';
import { getModelIdString } from '../../../utils/model';
import { RuntimeContextBuilder } from '../runtime-context';

describe('getModelIdString', () => {
	it('returns a plain string model id unchanged', () => {
		expect(getModelIdString('anthropic/claude-opus-4-8')).toBe('anthropic/claude-opus-4-8');
	});

	it('returns the id field for an OpenAI-compatible config object', () => {
		const config = {
			id: 'anthropic/claude-opus-4-8',
			url: 'https://proxy.example/v1',
		} as ModelConfig;
		expect(getModelIdString(config)).toBe('anthropic/claude-opus-4-8');
	});

	it('normalizes a pre-built LanguageModel provider sub-namespace to the canonical provider id', () => {
		// @ai-sdk/anthropic stamps `.provider` as 'anthropic.messages'; the billing
		// rate table is keyed on the canonical 'anthropic/<model>' id.
		const model = {
			provider: 'anthropic.messages',
			modelId: 'claude-opus-4-8',
		} as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('anthropic/claude-opus-4-8');
	});

	it('leaves a provider without a sub-namespace unchanged', () => {
		const model = { provider: 'anthropic', modelId: 'claude-opus-4-8' } as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('anthropic/claude-opus-4-8');
	});

	it('falls back to "unknown" when neither id nor modelId is present', () => {
		const model = {} as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('unknown');
	});
});

describe('Vertex thinking options', () => {
	it.each([
		{
			modelId: 'google-vertex/claude-sonnet-4-5',
			thinking: { budgetTokens: 4096 },
			expected: { anthropic: { thinking: { type: 'enabled', budgetTokens: 4096 } } },
		},
		{
			modelId: 'google-vertex/claude-opus-5@default',
			thinking: { budgetTokens: 4096 },
			expected: {
				anthropic: {
					thinking: { type: 'adaptive', display: 'summarized' },
					effort: 'medium',
				},
			},
		},
		{
			modelId: 'google-vertex/gemini-2.5-flash',
			thinking: { thinkingBudget: 2048 },
			expected: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
		},
		{
			modelId: 'google-vertex/gemini-3-flash-preview',
			thinking: { thinkingLevel: 'high' as const },
			expected: { google: { thinkingConfig: { thinkingLevel: 'high' } } },
		},
		{
			modelId: 'google-vertex/endpoints/123456789',
			sdk: '@ai-sdk/google-vertex',
			thinking: { thinkingBudget: 2048 },
			expected: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
		},
		{
			modelId: 'google-vertex/mistral-medium-3',
			thinking: { thinkingBudget: 2048 },
			expected: undefined,
		},
	])('maps thinking options for $modelId', ({ modelId, sdk, thinking, expected }) => {
		const builder = new RuntimeContextBuilder(
			{
				name: 'test',
				model: {
					id: modelId,
					sdk,
					project: 'test-project',
					location: 'global',
					clientEmail: 'test@example.com',
					privateKey: 'test-key',
				},
				instructions: '',
				thinking,
			},
			undefined,
		);

		expect(builder.buildStaticLoopContext().providerOptions).toEqual(expected);
		expect(builder.modelId).toBe(modelId);
	});
});
