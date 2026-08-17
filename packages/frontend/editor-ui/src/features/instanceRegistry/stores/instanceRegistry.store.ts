import type { ClusterInfo, ClusterInfoResponse } from '@n8n/api-types';
import * as clusterInfoApi from '@n8n/rest-api-client/api/cluster-info';
import * as instanceRegistryApi from '@n8n/rest-api-client/api/instance-registry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useInstanceRegistryStore = defineStore('instanceRegistry', () => {
	const rootStore = useRootStore();

	const clusterInfo = ref<ClusterInfoResponse | null>(null);

	// The process that answered the last /cluster-info poll plus, under the
	// hypervisor, the live view of every forked process.
	const clusterProcessInfo = ref<ClusterInfo | null>(null);

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

	async function fetchClusterProcessInfo(): Promise<void> {
		try {
			clusterProcessInfo.value = await clusterInfoApi.getClusterProcessInfo(
				rootStore.restApiContext,
			);
		} catch (error) {
			console.debug('Failed to fetch cluster process info', error);
		}
	}

	return {
		clusterInfo,
		clusterProcessInfo,
		isAvailable,
		fetchClusterInfo,
		fetchClusterProcessInfo,
	};
});
