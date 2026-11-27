import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Per-user safe testing rollout flag for the agent builder panel.
 * Mirrors the backend `SafeTestingFlagGate` check: only an explicit `true` enables it.
 */
export function useAgentSafeTestingFlag() {
	const posthog = usePostHog();
	return computed(() => posthog.isFeatureEnabled(AGENT_SAFE_TESTING_FLAG));
}
