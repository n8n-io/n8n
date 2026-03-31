import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { AiGatewayConfigDto } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getGatewayConfig, getGatewayCredits } from '@/features/ai/assistant/assistant.api';

export const useAiGatewayStore = defineStore(STORES.AI_GATEWAY, () => {
	const rootStore = useRootStore();

	const config = ref<AiGatewayConfigDto | null>(null);
	const creditsRemaining = ref<number | undefined>(undefined);
	const creditsQuota = ref<number | undefined>(undefined);

	async function fetchConfig(): Promise<void> {
		if (config.value !== null) return;
		try {
			config.value = await getGatewayConfig(rootStore.restApiContext);
		} catch (error) {
			console.error('[aiGatewayStore] Failed to fetch gateway config:', error);
		}
	}

	async function fetchCredits(): Promise<void> {
		try {
			const data = await getGatewayCredits(rootStore.restApiContext);
			creditsRemaining.value = data.creditsRemaining;
			creditsQuota.value = data.creditsQuota;
		} catch (error) {
			console.error('[aiGatewayStore] Failed to fetch credits:', error);
		}
	}

	function isNodeSupported(nodeName: string): boolean {
		return config.value?.nodes.includes(nodeName) ?? false;
	}

	function isCredentialTypeSupported(credentialType: string): boolean {
		return config.value?.credentialTypes.includes(credentialType) ?? false;
	}

	return {
		config,
		creditsRemaining,
		creditsQuota,
		fetchConfig,
		fetchCredits,
		isNodeSupported,
		isCredentialTypeSupported,
	};
});
