import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { STORES, PLACEHOLDER_EMPTY_WORKFLOW_ID, TIME } from '@/constants';
import { useBeforeUnload } from '@/composables/useBeforeUnload';
import type { IUser } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';

type ActiveUsersForWorkflows = {
	[workflowId: string]: Array<{ user: IUser; lastSeen: string }>;
};

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();

	const route = useRoute();
	const { addBeforeUnloadHandler } = useBeforeUnload({ route });
	const unloadTimeout = ref<NodeJS.Timeout | null>(null);
	addBeforeUnloadHandler(() => {
		// Notify that workflow is closed straight away
		notifyWorkflowClosed();
		if (uiStore.stateIsDirty) {
			// If user decided to stay on the page we notify that the workflow is opened again
			unloadTimeout.value = setTimeout(() => notifyWorkflowOpened, 5 * TIME.SECOND);
		}
	});

	const usersForWorkflows = ref<ActiveUsersForWorkflows>({});
	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	const getUsersForCurrentWorkflow = computed(() => {
		return usersForWorkflows.value[workflowsStore.workflowId] ?? [];
	});

	const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;
	const heartbeatTimer = ref<number | null>(null);

	const startHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
		heartbeatTimer.value = window.setInterval(notifyWorkflowOpened, HEARTBEAT_INTERVAL);
	};

	const stopHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
		}
	};

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

		notifyWorkflowOpened();
		startHeartbeat();
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		notifyWorkflowClosed();
		stopHeartbeat();
		pushStore.clearQueue();
		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}
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

	function notifyWorkflowOpened() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	}

	function notifyWorkflowClosed() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({ type: 'workflowClosed', workflowId });

		functionRemoveCurrentUserFromActiveUsers(workflowId);
	}

	return {
		usersForWorkflows,
		initialize,
		terminate,
		getUsersForCurrentWorkflow,
		startHeartbeat,
		stopHeartbeat,
	};
});
