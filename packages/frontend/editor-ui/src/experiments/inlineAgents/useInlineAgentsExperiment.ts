import { computed } from 'vue';

import { INLINE_AGENTS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInlineAgentsExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() =>
		posthogStore.isFeatureEnabled(INLINE_AGENTS_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}
