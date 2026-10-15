import { computed } from 'vue';

import { AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAgentsListEmptyStateTemplatesExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() =>
		posthogStore.isFeatureEnabled(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}
