import { computed } from 'vue';

import { CREDENTIAL_DESCRIPTIONS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useCredentialDescriptionsExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(() =>
		posthog.isFeatureEnabled(CREDENTIAL_DESCRIPTIONS_EXPERIMENT.name),
	);

	return { isEnabled };
}
