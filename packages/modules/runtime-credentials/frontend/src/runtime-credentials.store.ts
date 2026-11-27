import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

import { fetchCredentialTypeCatalog, fetchNodeTypeCatalog } from './runtime-credentials.catalog';
import type { CredentialTypeInfo, NodeTypeInfo } from './runtime-credentials.catalog';

import { createRule, deleteRule, fetchRules, updateRule } from './runtime-credentials.api';
import type {
	CreateRuntimeCredentialRule,
	RuntimeCredentialRule,
	UpdateRuntimeCredentialRule,
} from './runtime-credentials.api';

export const useRuntimeCredentialsStore = defineStore('runtimeCredentials', () => {
	const rootStore = useRootStore();

	const rules = ref<RuntimeCredentialRule[]>([]);
	const isLoading = ref(false);
	const hasLoadError = ref(false);

	// Type lists come from the static type files. They are large and never change after load.
	const credentialTypes = shallowRef<ReadonlyMap<string, CredentialTypeInfo>>(new Map());
	const nodeTypes = shallowRef<ReadonlyMap<string, NodeTypeInfo>>(new Map());
	const hasCatalogLoadError = ref(false);
	let catalogRequest: Promise<void> | undefined;

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

	/** Loads the credential and node type lists once. A failed load tries again on the next call. */
	async function loadCatalogs() {
		catalogRequest ??= (async () => {
			try {
				const [credentials, nodes] = await Promise.all([
					fetchCredentialTypeCatalog(rootStore.baseUrl),
					fetchNodeTypeCatalog(rootStore.baseUrl),
				]);
				credentialTypes.value = credentials;
				nodeTypes.value = nodes;
				hasCatalogLoadError.value = credentials.size === 0;
			} catch {
				hasCatalogLoadError.value = true;
			}
			if (hasCatalogLoadError.value) catalogRequest = undefined;
		})();
		await catalogRequest;
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

	return {
		rules,
		isLoading,
		hasLoadError,
		credentialTypes,
		nodeTypes,
		hasCatalogLoadError,
		loadRules,
		loadCatalogs,
		addRule,
		editRule,
		removeRule,
	};
});
