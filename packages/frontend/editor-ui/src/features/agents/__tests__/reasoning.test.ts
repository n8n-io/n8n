import { describe, expect, it } from 'vitest';

import { normalizeReasoningForModelChange } from '../utils/reasoning';

describe('normalizeReasoningForModelChange', () => {
	it('removes reasoning for an unsupported model while preserving sibling config', () => {
		const result = normalizeReasoningForModelChange(
			{ reasoning: 'high', toolCallConcurrency: 3 },
			false,
		);

		expect(result.config).toEqual({ toolCallConcurrency: 3 });
	});

	it('clears config when reasoning was the only key for an unsupported model', () => {
		const result = normalizeReasoningForModelChange({ reasoning: 'high' }, false);

		expect('config' in result).toBe(true);
		expect(result.config).toBeUndefined();
	});

	it('returns no changes when an unsupported model has no reasoning config', () => {
		const result = normalizeReasoningForModelChange({ toolCallConcurrency: 3 }, false);

		expect(result).toEqual({});
	});

	it('returns no changes when the model supports reasoning', () => {
		const result = normalizeReasoningForModelChange({ reasoning: 'high' }, true);

		expect(result).toEqual({});
	});

	it('returns no changes when reasoning support is unknown', () => {
		const result = normalizeReasoningForModelChange({ reasoning: 'high' }, undefined);

		expect(result).toEqual({});
	});
});
