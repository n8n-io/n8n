import type { AiGatewayConfigDto } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getGatewayConfig } from '@/features/ai/assistant/assistant.api';

export const useAiGatewayStore = defineStore(STORES.AI_GATEWAY, () => {
	const config = ref<AiGatewayConfigDto | null>(null);

	async function fetchConfig(): Promise<void> {
		if (config.value !== null) return;
		try {
			const rootStore = useRootStore();
			config.value = await getGatewayConfig(rootStore.restApiContext);
		} catch (error) {
			console.error('[aiGatewayStore] Failed to fetch gateway config:', error);
		}
	}

	function isNodeSupported(nodeName: string): boolean {
		return config.value?.nodes.includes(nodeName) ?? false;
	}

	function isCredentialTypeSupported(credentialType: string): boolean {
		return config.value?.credentialTypes.includes(credentialType) ?? false;
	}

	return { config, fetchConfig, isNodeSupported, isCredentialTypeSupported };
});
