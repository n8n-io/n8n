import {
	RUNTIME_INPUTS_MANAGE_SCOPE,
	RUNTIME_INPUTS_SETTINGS_PATH,
} from '../credentials.constants';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/**
 * The link from a run-time stub credential to its rule on the settings page. Only users who manage
 * security settings get it. The server sends the alias as `ruleAlias`. Without one, the link opens
 * the page without a rule.
 */
export function useRuntimeRuleLink() {
	const rbacStore = useRBACStore();
	const canManageRules = computed(() => rbacStore.hasScope(RUNTIME_INPUTS_MANAGE_SCOPE));

	function ruleLocation(ruleAlias: string | null | undefined): RouteLocationRaw {
		return ruleAlias
			? { path: RUNTIME_INPUTS_SETTINGS_PATH, query: { rule: ruleAlias } }
			: { path: RUNTIME_INPUTS_SETTINGS_PATH };
	}

	return { canManageRules, ruleLocation };
}
