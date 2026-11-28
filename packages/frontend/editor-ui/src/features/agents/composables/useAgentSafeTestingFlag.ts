import { computed } from 'vue';

import { AGENT_SAFE_TESTING_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Per-user safe testing experiment for the agent builder panel.
 * Mirrors the backend `SafeTestingFlagGate` check: only the `test` variant enables it.
 */
export function useAgentSafeTestingFlag() {
	const posthog = usePostHog();
	return computed(() =>
		posthog.isVariantEnabled(
			AGENT_SAFE_TESTING_EXPERIMENT.name,
			AGENT_SAFE_TESTING_EXPERIMENT.test,
		),
	);
}
