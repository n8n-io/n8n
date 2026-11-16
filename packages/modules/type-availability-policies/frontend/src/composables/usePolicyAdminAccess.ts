import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
	POLICY_KINDS,
	POLICY_MANAGE_SCOPE,
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
} from '../type-availability-policies.constants';

/**
 * Which instance policies the current user can manage. The module is active only on a licensed
 * instance, so this also covers the license.
 */
export function usePolicyAdminAccess() {
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();

	const manageableKinds = computed(() => {
		if (!settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID)) return [];
		// Without a project id, `hasScope` reads only the global scopes. A project admin holds these
		// scopes in a project, and that must not open the instance pages.
		return POLICY_KINDS.filter((kind) => rbacStore.hasScope(POLICY_MANAGE_SCOPE[kind]));
	});

	const canManagePolicies = computed(() => manageableKinds.value.length > 0);

	// The landing page only leads to the instance policy for a user with one of the two scopes.
	const entryRouteName = computed(() =>
		manageableKinds.value.length === 1 ? INSTANCE_POLICY_VIEW : POLICIES_LANDING_VIEW,
	);

	return { manageableKinds, canManagePolicies, entryRouteName };
}
