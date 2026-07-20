import { computed } from 'vue';

import { N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useN8nCreditsCredentialSelectionExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.name) ===
			N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
