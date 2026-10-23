import { computed } from 'vue';

import { useAgentEvalsFlag } from '@/features/ai/evaluation.ee/composables/useAgentEvalsFlag';

export function useTestAgentPreviewFlag() {
	const isAgentEvalsEnabled = useAgentEvalsFlag();

	// The force setting only bypasses agent eligibility, not this rollout gate.
	const isFeatureEnabled = computed(() => isAgentEvalsEnabled.value);

	return { isFeatureEnabled };
}
