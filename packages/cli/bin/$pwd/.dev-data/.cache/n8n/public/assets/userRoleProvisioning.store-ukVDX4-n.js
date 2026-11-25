import { Bf as readonly, Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { RC as getProvisioningConfig, bC as useRootStore, zC as saveProvisioningConfig } from "./app-D5flEmb-.js";
//#region src/features/settings/sso/provisioning/composables/userRoleProvisioning.store.ts
init_reactivity_esm_bundler();
/**
* Composable to load and save provisioning config
*/
var useUserRoleProvisioningStore = defineStore("userRoleProvisioning", () => {
	const rootStore = useRootStore();
	const provisioningConfig = ref();
	const getProvisioningConfig$1 = async () => {
		try {
			const config = await getProvisioningConfig(rootStore.restApiContext);
			provisioningConfig.value = config;
			return config;
		} catch (error) {
			console.error("Failed to fetch provisioning config:", error);
			throw error;
		}
	};
	const saveProvisioningConfig$1 = async (config) => {
		try {
			const updatedConfig = await saveProvisioningConfig(rootStore.restApiContext, config);
			provisioningConfig.value = updatedConfig;
			return updatedConfig;
		} catch (error) {
			console.error("Failed to save provisioning config:", error);
			throw error;
		}
	};
	return {
		provisioningConfig: readonly(provisioningConfig),
		getProvisioningConfig: getProvisioningConfig$1,
		saveProvisioningConfig: saveProvisioningConfig$1
	};
});
//#endregion
export { useUserRoleProvisioningStore as t };
