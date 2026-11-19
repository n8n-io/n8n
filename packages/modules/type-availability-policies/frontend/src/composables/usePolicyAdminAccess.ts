import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed } from 'vue';

import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
	POLICY_KINDS,
	POLICY_MANAGE_SCOPE,
} from '../type-availability-policies.constants';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/**
 * Which instance policies the current user can manage. The module is active only on a licensed
 * instance, so this also covers the license.
 */
export function usePolicyAdminAccess() {
	const policiesStore = useTypeAvailabilityPoliciesStore();
	const rbacStore = useRBACStore();

	const manageableKinds = computed(() => {
		if (!policiesStore.isEnabled) return [];
		// Without a project id, `hasScope` reads only the global scopes. A project admin holds these
		// scopes in a project, and that must not open the instance pages.
		return POLICY_KINDS.filter((kind) => rbacStore.hasScope(POLICY_MANAGE_SCOPE[kind]));
	});

	const canManagePolicies = computed(() => manageableKinds.value.length > 0);

	// A user with one scope has nothing to choose on the landing page, so they skip it.
	const entryRouteName = computed(() =>
		manageableKinds.value.length === 1 ? INSTANCE_POLICY_VIEW : POLICIES_LANDING_VIEW,
	);

	return { manageableKinds, canManagePolicies, entryRouteName };
}
