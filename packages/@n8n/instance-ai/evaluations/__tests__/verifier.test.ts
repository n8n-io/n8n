import { supportsOpenAiReasoning } from '../checklist/verifier';

describe('supportsOpenAiReasoning', () => {
	it('enables reasoning for GPT-5 and o-series models', () => {
		expect(supportsOpenAiReasoning('gpt-5')).toBe(true);
		expect(supportsOpenAiReasoning('gpt-5.5')).toBe(true);
		expect(supportsOpenAiReasoning('o3-mini')).toBe(true);
		expect(supportsOpenAiReasoning('o4')).toBe(true);
	});

	it('does not enable reasoning for older OpenAI models', () => {
		expect(supportsOpenAiReasoning('gpt-4.1')).toBe(false);
		expect(supportsOpenAiReasoning('gpt-4o')).toBe(false);
		expect(supportsOpenAiReasoning('gpt-3.5-turbo')).toBe(false);
	});
});
