import { useSettingsStore } from '@/app/stores/settings.store';
import type { RBACPermissionCheck, EnterprisePermissionOptions } from '@/app/types/rbac';

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
		return features.every((feature) => settingsStore.isEnterpriseFeatureEnabled[feature]);
	} else {
		return features.some((feature) => settingsStore.isEnterpriseFeatureEnabled[feature]);
	}
};
