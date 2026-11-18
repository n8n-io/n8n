import type { RuntimeCredentialRule, RuntimeCredentialRuleWithSource } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getRuntimeCredentialRules, updateRuntimeCredentialRules } from './runtime-credentials.api';
import { RUNTIME_CREDENTIALS_STORE } from './runtime-credentials.constants';

function toRule({ alias, nodeType, path, description }: RuntimeCredentialRuleWithSource) {
	const rule: RuntimeCredentialRule = { alias, nodeType, path };
	if (description) rule.description = description;
	return rule;
}

export const useRuntimeCredentialsStore = defineStore(RUNTIME_CREDENTIALS_STORE, () => {
	const rootStore = useRootStore();

	const rules = ref<RuntimeCredentialRuleWithSource[]>([]);
	const loading = ref(false);
	const saving = ref(false);

	const envRules = computed(() => rules.value.filter((rule) => rule.source === 'env'));
	const savedRules = computed(() => rules.value.filter((rule) => rule.source === 'settings'));

	async function fetchRules() {
		loading.value = true;
		try {
			rules.value = (await getRuntimeCredentialRules(rootStore.restApiContext)).rules;
		} finally {
			loading.value = false;
		}
	}

	async function save(next: RuntimeCredentialRule[]) {
		saving.value = true;
		try {
			rules.value = (await updateRuntimeCredentialRules(rootStore.restApiContext, next)).rules;
		} finally {
			saving.value = false;
		}
	}

	/** Adds the rule, or replaces the saved rule that had `previousAlias`. */
	async function upsertRule(rule: RuntimeCredentialRule, previousAlias?: string) {
		const others = savedRules.value
			.filter(({ alias }) => alias !== (previousAlias ?? rule.alias))
			.map(toRule);
		await save([...others, rule]);
	}

	async function removeRule(alias: string) {
		await save(savedRules.value.filter((rule) => rule.alias !== alias).map(toRule));
	}

	return { rules, loading, saving, envRules, savedRules, fetchRules, upsertRule, removeRule };
});
