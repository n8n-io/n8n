import type { ClusterInfoResponse } from '@n8n/api-types';
import * as instanceRegistryApi from '@n8n/rest-api-client/api/instance-registry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useInstanceRegistryStore = defineStore('instanceRegistry', () => {
	const rootStore = useRootStore();

	const clusterInfo = ref<ClusterInfoResponse | null>(null);

	const isAvailable = computed(() => clusterInfo.value !== null);

	async function fetchClusterInfo(): Promise<void> {
		try {
			clusterInfo.value = await instanceRegistryApi.getClusterInfo(rootStore.restApiContext);
		} catch (error) {
			// Leave the previous snapshot in place on transient network errors — debug
			// generation must never fail because cluster info couldn't be fetched.
			console.debug('Failed to fetch instance registry cluster info', error);
		}
	}

	return {
		clusterInfo,
		isAvailable,
		fetchClusterInfo,
	};
});
