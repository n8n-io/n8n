import { computed } from 'vue';

import { INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiBrowserCredentialSetupExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.name) ===
			INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
