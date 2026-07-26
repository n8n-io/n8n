import type { ModelConfig } from '../../../types/sdk/agent';
import { getModelIdString } from '../runtime-context';

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
