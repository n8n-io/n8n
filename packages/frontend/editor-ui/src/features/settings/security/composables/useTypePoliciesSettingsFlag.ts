import { computed } from 'vue';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * The node and credential policy settings pages stay hidden until
 * `N8N_ENV_FEAT_NODE_AND_CREDENTIAL_POLICIES_SETTINGS` is on. The policies still apply.
 */
export const useTypePoliciesSettingsFlag = () => {
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(() => check.value('NODE_AND_CREDENTIAL_POLICIES_SETTINGS'));

	return { isEnabled };
};
