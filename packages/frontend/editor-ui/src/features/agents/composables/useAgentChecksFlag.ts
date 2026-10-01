import { computed } from 'vue';

import { useAgentEvalsFlag } from '@/features/ai/evaluation.ee/composables/useAgentEvalsFlag';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

const LOCAL_OVERRIDE_KEY = 'N8N_AGENT_CHECKS';

const hasLocalOverride = () => {
	if (!import.meta.env.DEV) return false;
	try {
		return window.localStorage.getItem(LOCAL_OVERRIDE_KEY) === 'true';
	} catch {
		return false;
	}
};

/**
 * Gate for the Checks prototype, which replaces the Evals tab's content. Needs
 * the agent-evals flag (it runs on the evals API) plus `N8N_ENV_FEAT_AGENT_CHECKS`;
 * dev builds also honour `localStorage.N8N_AGENT_CHECKS = 'true'` so the surface
 * can be tried against a shared backend without the env flag.
 */
export const useAgentChecksFlag = () => {
	const isEvalsEnabled = useAgentEvalsFlag();
	const { check } = useEnvFeatureFlag();
	return computed(
		() => isEvalsEnabled.value && (check.value('AGENT_CHECKS') || hasLocalOverride()),
	);
};
