import { ref, readonly } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as provisioningApi from '@n8n/rest-api-client/api/provisioning';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';

/**
 * Composable to load and save provisioning config
 */
export const useUserRoleProvisioningStore = defineStore('userRoleProvisioning', () => {
	const rootStore = useRootStore();

	const provisioningConfig = ref<ProvisioningConfig | undefined>();

	const getProvisioningConfig = async () => {
		try {
			const config = await provisioningApi.getProvisioningConfig(rootStore.restApiContext);
			provisioningConfig.value = config;
			return config;
		} catch (error) {
			console.error('Failed to fetch provisioning config:', error);
			throw error;
		}
	};

	const saveProvisioningConfig = async (config: Partial<ProvisioningConfig>) => {
		try {
			const updatedConfig = await provisioningApi.saveProvisioningConfig(
				rootStore.restApiContext,
				config,
			);
			provisioningConfig.value = updatedConfig;
			return updatedConfig;
		} catch (error) {
			console.error('Failed to save provisioning config:', error);
			throw error;
		}
	};

	return {
		provisioningConfig: readonly(provisioningConfig),
		getProvisioningConfig,
		saveProvisioningConfig,
	};
});
