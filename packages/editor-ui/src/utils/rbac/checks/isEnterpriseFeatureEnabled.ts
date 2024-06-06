import { useSettingsStore } from '@/stores/settings.store';
import type { RBACPermissionCheck, EnterprisePermissionOptions } from '@/types/rbac';

export const isEnterpriseFeatureEnabled: RBACPermissionCheck<EnterprisePermissionOptions> = (
	options,
) => {
	if (!options?.feature) {
		return true;
	}

	const features = Array.isArray(options.feature) ? options.feature : [options.feature];
	const settingsStore = useSettingsStore();
	const mode = options.mode ?? 'allOf';
	if (mode === 'allOf') {
		return features.every(settingsStore.isEnterpriseFeatureEnabled);
	} else {
		return features.some(settingsStore.isEnterpriseFeatureEnabled);
	}
};
