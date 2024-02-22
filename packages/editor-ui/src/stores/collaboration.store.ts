import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { STORES } from '@/constants';
import type { IUser } from '@/Interface';

type ActiveUsersForWorkflows = {
	[workflowId: string]: Array<{ user: IUser; lastSeen: string }>;
};

export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowStore = useWorkflowsStore();

	const usersForWorkflows = ref<ActiveUsersForWorkflows>({});

	pushStore.addEventListener((event) => {
		if (event.type === 'activeWorkflowUsersChanged') {
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
