import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	createRule,
	deleteRule,
	fetchInstancePolicy,
	fetchProjectPolicy,
	fetchRules,
	saveProjectPolicy,
	updateRule,
} from './runtime-credentials.api';
import type {
	CreateRuntimeCredentialRule,
	RequestFedPolicy,
	RuntimeCredentialRule,
	UpdateRuntimeCredentialRule,
} from './runtime-credentials.api';

export const useRuntimeCredentialsStore = defineStore('runtimeCredentials', () => {
	const rootStore = useRootStore();

	const rules = ref<RuntimeCredentialRule[]>([]);
	const isLoading = ref(false);
	const hasLoadError = ref(false);

	const instancePolicy = ref<RequestFedPolicy | null>(null);
	const projectPolicy = ref<RequestFedPolicy | null>(null);
	const isPolicyLoading = ref(false);
	const hasPolicyLoadError = ref(false);

	async function loadRules() {
		isLoading.value = true;
		hasLoadError.value = false;
		try {
			rules.value = await fetchRules(rootStore.restApiContext);
		} catch {
			hasLoadError.value = true;
		} finally {
			isLoading.value = false;
		}
	}

	async function addRule(rule: CreateRuntimeCredentialRule) {
		await createRule(rootStore.restApiContext, rule);
		await loadRules();
	}

	async function editRule(alias: string, update: UpdateRuntimeCredentialRule) {
		await updateRule(rootStore.restApiContext, alias, update);
		await loadRules();
	}

	async function removeRule(alias: string) {
		await deleteRule(rootStore.restApiContext, alias);
		await loadRules();
	}

	async function loadPolicies(projectId: string) {
		isPolicyLoading.value = true;
		hasPolicyLoadError.value = false;
		try {
			const [instance, project] = await Promise.all([
				fetchInstancePolicy(rootStore.restApiContext),
				fetchProjectPolicy(rootStore.restApiContext, projectId),
			]);
			instancePolicy.value = instance;
			projectPolicy.value = project;
		} catch {
			hasPolicyLoadError.value = true;
		} finally {
			isPolicyLoading.value = false;
		}
	}

	/** Adds a deny rule for one credential type name to the project policy. */
	async function denyCredentialType(projectId: string, credentialType: string) {
		const current = projectPolicy.value;
		if (!current) return;
		projectPolicy.value = await saveProjectPolicy(rootStore.restApiContext, projectId, {
			...current,
			rules: [
				...current.rules,
				{
					id: globalThis.crypto.randomUUID(),
					action: 'deny',
					selector: { kind: 'name', value: credentialType },
				},
			],
		});
	}

	return {
		rules,
		isLoading,
		hasLoadError,
		instancePolicy,
		projectPolicy,
		isPolicyLoading,
		hasPolicyLoadError,
		loadRules,
		addRule,
		editRule,
		removeRule,
		loadPolicies,
		denyCredentialType,
	};
});
