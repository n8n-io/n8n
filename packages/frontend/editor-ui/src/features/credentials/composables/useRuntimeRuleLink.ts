import {
	RUNTIME_INPUTS_MANAGE_SCOPE,
	RUNTIME_INPUTS_SETTINGS_PATH,
} from '../credentials.constants';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/** The seeder names a run-time stub `Request value: <alias>`. The id hashes the alias, so it cannot give it back. */
const STUB_NAME_PREFIX = 'Request value: ';

export function getRuntimeRuleAlias(credentialName: string | undefined): string | undefined {
	if (!credentialName?.startsWith(STUB_NAME_PREFIX)) return undefined;
	return credentialName.slice(STUB_NAME_PREFIX.length) || undefined;
}

/**
 * The link from a run-time stub credential to its rule on the settings page. Only users who manage
 * security settings get it. Without a readable alias, the link opens the page without a rule.
 */
export function useRuntimeRuleLink() {
	const rbacStore = useRBACStore();
	const canManageRules = computed(() => rbacStore.hasScope(RUNTIME_INPUTS_MANAGE_SCOPE));

	function ruleLocation(credentialName: string | undefined): RouteLocationRaw {
		const alias = getRuntimeRuleAlias(credentialName);
		return alias
			? { path: RUNTIME_INPUTS_SETTINGS_PATH, query: { rule: alias } }
			: { path: RUNTIME_INPUTS_SETTINGS_PATH };
	}

	return { canManageRules, ruleLocation };
}
