import { computed } from 'vue';

import { INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';

export function useInstanceAiBrowserCredentialSetupExperiment() {
	const posthogStore = usePostHog();

	// Automatic setup runs through Browser Use, so it requires Browser Use itself.
	const { isFeatureEnabled: isBrowserUseEnabled } = useInstanceAiBrowserUseExperiment();

	const isFeatureEnabled = computed(
		() =>
			isBrowserUseEnabled.value &&
			posthogStore.getVariant(INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.name) ===
				INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
