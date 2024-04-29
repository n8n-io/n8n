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
	const removeEventListener = ref<(() => void) | null>(null);

	const getUsersForCurrentWorkflow = computed(() => {
		return usersForWorkflows.value[workflowStore.workflowId];
	});

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((event) => {
			if (event.type === 'activeWorkflowUsersChanged') {
				const activeWorkflowId = workflowStore.workflowId;
				if (event.data.workflowId === activeWorkflowId) {
					usersForWorkflows.value[activeWorkflowId] = event.data.activeUsers;
				}
			}
		});
	}

	function terminate() {
		if (typeof removeEventListener.value === 'function') {
			removeEventListener.value();
		}
	}

	function workflowUsersUpdated(data: ActiveUsersForWorkflows) {
		usersForWorkflows.value = data;
	}

	function notifyWorkflowOpened(workflowId: string) {
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	}

	function notifyWorkflowClosed(workflowId: string) {
		pushStore.send({ type: 'workflowClosed', workflowId });
	}

	return {
		usersForWorkflows,
		initialize,
		terminate,
		notifyWorkflowOpened,
		notifyWorkflowClosed,
		workflowUsersUpdated,
		getUsersForCurrentWorkflow,
	};
});
