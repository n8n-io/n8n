import { computed } from 'vue';

import { AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';

const AGENTS_LIST_EMPTY_STATE_TEMPLATES_VARIANTS = [
	AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.control,
	AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test,
] as const;

export type AgentsListEmptyStateTemplatesVariant =
	(typeof AGENTS_LIST_EMPTY_STATE_TEMPLATES_VARIANTS)[number];

function isAgentsListEmptyStateTemplatesVariant(
	value: unknown,
): value is AgentsListEmptyStateTemplatesVariant {
	return AGENTS_LIST_EMPTY_STATE_TEMPLATES_VARIANTS.some((variant) => variant === value);
}

export function useAgentsListEmptyStateTemplatesExperiment() {
	const posthogStore = usePostHog();
	const instanceAiReady = useInstanceAiReady();

	// undefined unless Instance AI is ready — exposure must match what the user saw
	const variant = computed<AgentsListEmptyStateTemplatesVariant | undefined>(() => {
		if (!instanceAiReady.value) return undefined;
		const assigned = posthogStore.getVariant(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
		return isAgentsListEmptyStateTemplatesVariant(assigned) ? assigned : undefined;
	});

	const isFeatureEnabled = computed(
		() => variant.value === AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test,
	);

	function trackExposure() {
		if (!variant.value) return;
		posthogStore.trackExposure(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	}

	return { isFeatureEnabled, variant, trackExposure };
}
