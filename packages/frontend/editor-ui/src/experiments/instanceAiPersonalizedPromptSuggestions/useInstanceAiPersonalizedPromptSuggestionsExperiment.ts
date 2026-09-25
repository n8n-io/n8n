import { computed } from 'vue';

import { INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import type { PersonalizedPromptFormat } from './types';

export function useInstanceAiPersonalizedPromptSuggestionsExperiment() {
	const posthogStore = usePostHog();

	const currentVariant = computed(() =>
		posthogStore.getVariant(INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.name),
	);
	const suggestionFormat = computed<PersonalizedPromptFormat | null>(() => {
		if (
			currentVariant.value === INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.variantCards
		) {
			return 'cards';
		}

		if (
			currentVariant.value === INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT.variantList
		) {
			return 'list';
		}

		return null;
	});
	const isTreatmentVariant = computed(() => suggestionFormat.value !== null);

	return {
		currentVariant,
		suggestionFormat,
		isTreatmentVariant,
	};
}
