import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { AiGatewayConfigDto, AiGatewayUsageEntry } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	getGatewayConfig,
	getGatewayCredits,
	getGatewayUsage,
} from '@/features/ai/assistant/assistant.api';

function toError(e: unknown): Error {
	return e instanceof Error ? e : new Error(String(e));
}

export const useAiGatewayStore = defineStore(STORES.AI_GATEWAY, () => {
	const rootStore = useRootStore();

	const config = ref<AiGatewayConfigDto | null>(null);
	const creditsRemaining = ref<number | undefined>(undefined);
	const creditsQuota = ref<number | undefined>(undefined);
	const usageEntries = ref<AiGatewayUsageEntry[]>([]);
	const usageTotal = ref<number>(0);
	const fetchError = ref<Error | null>(null);

	async function fetchConfig(): Promise<void> {
		if (config.value !== null) return;
		try {
			config.value = await getGatewayConfig(rootStore.restApiContext);
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchCredits(): Promise<void> {
		try {
			const data = await getGatewayCredits(rootStore.restApiContext);
			creditsRemaining.value = data.creditsRemaining;
			creditsQuota.value = data.creditsQuota;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchUsage(offset = 0, limit = 50): Promise<void> {
		try {
			const data = await getGatewayUsage(rootStore.restApiContext, offset, limit);
			usageEntries.value = data.entries;
			usageTotal.value = data.total;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchMoreUsage(offset: number, limit = 50): Promise<void> {
		try {
			const data = await getGatewayUsage(rootStore.restApiContext, offset, limit);
			usageEntries.value = [...usageEntries.value, ...data.entries];
			usageTotal.value = data.total;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
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
		usageEntries,
		usageTotal,
		fetchError,
		fetchConfig,
		fetchCredits,
		fetchUsage,
		fetchMoreUsage,
		isNodeSupported,
		isCredentialTypeSupported,
	};
});
