import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { STORES } from '@/constants';
import type { IUser } from '@/Interface';
import { useUsersStore } from '@/stores/users.store';

type ActiveUsersForWorkflows = {
	[workflowId: string]: Array<{ user: IUser; lastSeen: string }>;
};

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowStore = useWorkflowsStore();
	const usersStore = useUsersStore();

	const usersForWorkflows = ref<ActiveUsersForWorkflows>({});
	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	const getUsersForCurrentWorkflow = computed(() => {
		return usersForWorkflows.value[workflowStore.workflowId] ?? [];
	});

	function initialize() {
		if (pushStoreEventListenerRemovalFn.value) {
			return;
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (event.type === 'activeWorkflowUsersChanged') {
				const workflowId = event.data.workflowId;
				usersForWorkflows.value[workflowId] = event.data.activeUsers;
			}
		});
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
	}

	function workflowUsersUpdated(data: ActiveUsersForWorkflows) {
		usersForWorkflows.value = data;
	}

	function functionRemoveCurrentUserFromActiveUsers(workflowId: string) {
		const workflowUsers = usersForWorkflows.value[workflowId];
		if (!workflowUsers) {
			return;
		}

		usersForWorkflows.value[workflowId] = workflowUsers.filter(
			(activeUser) => activeUser.user.id !== usersStore.currentUserId,
		);
	}

	function notifyWorkflowOpened(workflowId: string) {
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	}

	function notifyWorkflowClosed(workflowId: string) {
		pushStore.send({ type: 'workflowClosed', workflowId });

		functionRemoveCurrentUserFromActiveUsers(workflowId);
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
