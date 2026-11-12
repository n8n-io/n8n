import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

/**
 * SCIM needs the `feat:scim` license, the pre-GA opt-in `N8N_ENV_FEAT_SCIM`
 * and the `scim:manage` scope. The backend accepts only `'true'` for the
 * opt-in, so this check does not use the looser `useEnvFeatureFlag` check.
 */
export function isScimAvailable(): boolean {
	const settingsStore = useSettingsStore();
	return (
		settingsStore.isModuleActive('scim') &&
		settingsStore.settings.envFeatureFlags?.N8N_ENV_FEAT_SCIM === 'true' &&
		useRBACStore().hasScope('scim:manage')
	);
}
