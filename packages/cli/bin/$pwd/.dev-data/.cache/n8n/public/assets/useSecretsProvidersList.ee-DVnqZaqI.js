import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { $C as getSecretProviderTypes, Cm as useRBACStore, GS as EnterpriseEditionFeature, QC as getSecretProviderConnections, ZC as getSecretProviderConnectionByKey, bC as useRootStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/integrations/secretsProviders.ee/composables/useSecretsProvidersList.ee.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useSecretsProvidersList() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const rbacStore = useRBACStore();
	const providerTypes = ref([]);
	const secrets = ref({});
	const activeConnections = ref([]);
	const isLoadingProviderTypes = ref(false);
	const isLoadingActiveConnections = ref(false);
	const canCreate = computed(() => rbacStore.hasScope("externalSecretsProvider:create"));
	const canUpdate = computed(() => rbacStore.hasScope("externalSecretsProvider:update"));
	async function fetchProviderTypes() {
		isLoadingProviderTypes.value = true;
		try {
			providerTypes.value = await getSecretProviderTypes(rootStore.restApiContext);
		} finally {
			isLoadingProviderTypes.value = false;
		}
	}
	async function fetchActiveConnections() {
		if (!rbacStore.hasScope("externalSecretsProvider:list")) return;
		isLoadingActiveConnections.value = true;
		try {
			activeConnections.value = await getSecretProviderConnections(rootStore.restApiContext);
		} catch {
			activeConnections.value = [];
		} finally {
			isLoadingActiveConnections.value = false;
		}
	}
	async function fetchConnection(providerKey) {
		const connection = await getSecretProviderConnectionByKey(rootStore.restApiContext, providerKey);
		const index = activeConnections.value.findIndex((c) => c.name === providerKey);
		if (index !== -1) activeConnections.value[index] = connection;
	}
	const isLoading = computed(() => isLoadingProviderTypes.value || isLoadingActiveConnections.value);
	const isEnterpriseExternalSecretsEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets]);
	const activeProviders = computed(() => {
		return [...activeConnections.value].sort((a, b) => b.name.localeCompare(a.name));
	});
	return {
		providerTypes: computed(() => providerTypes.value),
		fetchProviderTypes,
		activeProviders,
		fetchActiveConnections,
		fetchConnection,
		canCreate,
		canUpdate,
		isLoading,
		isEnterpriseExternalSecretsEnabled,
		secrets: computed(() => secrets.value)
	};
}
//#endregion
export { useSecretsProvidersList as t };
