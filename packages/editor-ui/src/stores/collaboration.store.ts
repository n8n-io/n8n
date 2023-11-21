import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ActiveUsersForWorkflows, PushDataUsersForWorkflow } from '@/Interface';
import { usePushConnectionStore, useWorkflowsStore } from '@/stores';
import { STORES } from '@/constants';

export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowStore = useWorkflowsStore();

	const usersForWorkflows = ref<ActiveUsersForWorkflows>({});

	pushStore.addEventListener((event) => {
		if (event.type === 'activeWorkflowUsersChanged') {
			console.log('activeWorkflowUsersChanged', event.data);
			const activeWorkflowId = workflowStore.workflowId;
			if (event.data.workflowId === activeWorkflowId) {
				usersForWorkflows.value[activeWorkflowId] = event.data.activeUsers;
			}
		}
	});

	const workflowUsersUpdated = (data: ActiveUsersForWorkflows) => {
		usersForWorkflows.value = data;
	};

	const notifyWorkflowOpened = (workflowId: string) => {
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	};

	const notifyWorkflowClosed = (workflowId: string) => {
		pushStore.send({ type: 'workflowClosed', workflowId });
	};

	const getUsersForCurrentWorkflow = computed(() => {
		return usersForWorkflows.value[workflowStore.workflowId];
	});

	return {
		usersForWorkflows,
		notifyWorkflowOpened,
		notifyWorkflowClosed,
		workflowUsersUpdated,
		getUsersForCurrentWorkflow,
	};
});
