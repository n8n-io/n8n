import { computed } from 'vue';

import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export const useRedactionEnforcementFeatureFlag = () => {
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(() => check.value('REDACTION_ENFORCEMENT'));

	return { isEnabled };
};
