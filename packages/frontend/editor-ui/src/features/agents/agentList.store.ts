import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { listAgentsPageGlobal } from './composables/useAgentApi';

export const useAgentListStore = defineStore('agentList', () => {
	const rootStore = useRootStore();
	const totalCount = ref<number>();

	async function fetchTotalCount() {
		const { count } = await listAgentsPageGlobal(rootStore.restApiContext, { take: 1 });
		totalCount.value = count;
	}

	return { totalCount, fetchTotalCount };
});
