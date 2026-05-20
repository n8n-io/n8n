import { describe, expect, it } from 'vitest';

import {
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2,
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION,
} from './suggestions';

describe('instance AI prompt suggestions v2 catalog', () => {
	it('uses the v2 catalog version', () => {
		expect(INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION).toBe('v2');
	});

	it('contains 12 unique prompt-only suggestions', () => {
		expect(INSTANCE_AI_PROMPT_SUGGESTIONS_V2).toHaveLength(12);
		const ids = INSTANCE_AI_PROMPT_SUGGESTIONS_V2.map(({ id }) => id);

		expect(new Set(ids).size).toBe(INSTANCE_AI_PROMPT_SUGGESTIONS_V2.length);

		for (const suggestion of INSTANCE_AI_PROMPT_SUGGESTIONS_V2) {
			expect(suggestion).toMatchObject({
				type: 'prompt',
				promptKey: expect.any(String),
			});
			expect('examples' in suggestion).toBe(false);
		}
	});

	it('uses experiment-scoped i18n keys for labels and prompts', () => {
		for (const suggestion of INSTANCE_AI_PROMPT_SUGGESTIONS_V2) {
			expect(suggestion.labelKey).toMatch(
				/^experiments\.instanceAiPromptSuggestionsV2\.suggestions\./,
			);
			expect(suggestion.promptKey).toMatch(
				/^experiments\.instanceAiPromptSuggestionsV2\.suggestions\./,
			);
		}
	});
});
