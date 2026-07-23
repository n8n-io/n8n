import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT,
} from '@/app/constants/experiments';

import { useInstanceAiPersonalizedPromptSuggestionsExperiment } from './useInstanceAiPersonalizedPromptSuggestionsExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useInstanceAiPersonalizedPromptSuggestionsExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{
			variant: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.variantCards,
			format: 'cards',
			isTreatmentVariant: true,
		},
		{
			variant: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.variantList,
			format: 'list',
			isTreatmentVariant: true,
		},
		{
			variant: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.control,
			format: null,
			isTreatmentVariant: false,
		},
		{ variant: undefined, format: null, isTreatmentVariant: false },
	])(
		'returns format $format when PostHog variant is $variant',
		({ variant, format, isTreatmentVariant }) => {
			getVariant.mockReturnValue(variant);

			const experiment = useInstanceAiPersonalizedPromptSuggestionsExperiment();

			expect(experiment.currentVariant.value).toBe(variant);
			expect(experiment.suggestionFormat.value).toBe(format);
			expect(experiment.isTreatmentVariant.value).toBe(isTreatmentVariant);
			expect(getVariant).toHaveBeenCalledWith(
				INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.name,
			);
		},
	);

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(
			INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.name,
		);
	});
});
