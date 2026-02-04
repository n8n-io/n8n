/* eslint-disable import-x/extensions */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Collaborator } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';

import { TIME } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { useBeforeUnload } from '@/app/composables/useBeforeUnload';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import * as workflowsApi from '@/app/api/workflows';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;
const WRITE_LOCK_HEARTBEAT_INTERVAL = 30 * TIME.SECOND;
const LOCK_STATE_POLL_INTERVAL = 20 * TIME.SECOND;
const INACTIVITY_CHECK_INTERVAL = 5 * TIME.SECOND;
const INACTIVITY_TIMEOUT_THRESHOLD = 20 * TIME.SECOND;

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const builderStore = useBuilderStore();

	const route = useRoute();
	const { addBeforeUnloadEventBindings, removeBeforeUnloadEventBindings, addBeforeUnloadHandler } =
		useBeforeUnload({ route });
	const unloadTimeout = ref<NodeJS.Timeout | null>(null);

	const collaborators = ref<Collaborator[]>([]);

	// Write-lock state for single-write mode
	const currentWriterId = ref<string | null>(null);
	const lastActivityTime = ref<number>(Date.now());
	const activityCheckInterval = ref<number | null>(null);

	const heartbeatTimer = ref<number | null>(null);
	const writeLockHeartbeatTimer = ref<number | null>(null);
	const lockStatePollTimer = ref<number | null>(null);

	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	// Callback for refreshing the canvas after workflow updates
	let refreshCanvasCallback: ((workflow: IWorkflowDb) => void) | null = null;

	// Computed properties for write-lock state
	const isCurrentUserWriter = computed(() => {
		return currentWriterId.value === usersStore.currentUserId;
	});

	const currentWriter = computed(() => {
		if (!currentWriterId.value) return null;
		return collaborators.value.find((c) => c.user.id === currentWriterId.value);
	});

	const isAnyoneWriting = computed(() => {
		return currentWriterId.value !== null;
	});

	const shouldBeReadOnly = computed(() => {
		return isAnyoneWriting.value && !isCurrentUserWriter.value;
	});

	async function fetchWriteLockState(): Promise<string | null> {
		try {
			const { workflowId } = workflowsStore;
			if (!workflowsStore.isWorkflowSaved[workflowId]) {
				return null;
			}

			const response = await workflowsApi.getWorkflowWriteLock(
				rootStore.restApiContext,
				workflowId,
			);
			return response.userId;
		} catch {
			return null;
		}
	}

	function notifyWorkflowOpened() {
		if (!workflowsStore.isWorkflowSaved[workflowsStore.workflowId]) return;
		pushStore.send({ type: 'workflowOpened', workflowId: workflowsStore.workflowId });
	}

	function notifyWorkflowClosed() {
		if (!workflowsStore.isWorkflowSaved[workflowsStore.workflowId]) return;
		pushStore.send({ type: 'workflowClosed', workflowId: workflowsStore.workflowId });

		collaborators.value = collaborators.value.filter(
			({ user }) => user.id !== usersStore.currentUserId,
		);
	}

	const stopHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
	};

	const startHeartbeat = () => {
		stopHeartbeat();
		heartbeatTimer.value = window.setInterval(notifyWorkflowOpened, HEARTBEAT_INTERVAL);
	};

	const stopWriteLockHeartbeat = () => {
		if (writeLockHeartbeatTimer.value !== null) {
			clearInterval(writeLockHeartbeatTimer.value);
			writeLockHeartbeatTimer.value = null;
		}
	};

	const sendWriteLockHeartbeat = () => {
		if (!isCurrentUserWriter.value) {
			stopWriteLockHeartbeat();
			return;
		}

		pushStore.send({
			type: 'writeAccessHeartbeat',
			workflowId: workflowsStore.workflowId,
		});
	};

	const startWriteLockHeartbeat = () => {
		stopWriteLockHeartbeat();
		writeLockHeartbeatTimer.value = window.setInterval(
			sendWriteLockHeartbeat,
			WRITE_LOCK_HEARTBEAT_INTERVAL,
		);
	};

	const stopLockStatePolling = () => {
		if (lockStatePollTimer.value !== null) {
			clearInterval(lockStatePollTimer.value);
			lockStatePollTimer.value = null;
		}
	};

	/**
	 * Poll lock state from backend to detect if lock has expired.
	 * Only runs when in read-only mode (someone else has the lock).
	 */
	const pollLockState = async () => {
		if (!shouldBeReadOnly.value) {
			stopLockStatePolling();
			return;
		}

		const writeLockUserId = await fetchWriteLockState();

		// If lock is gone on backend but still exists in frontend, clear it
		if (!writeLockUserId && currentWriterId.value) {
			currentWriterId.value = null;
			stopLockStatePolling();
		}
	};

	const startLockStatePolling = () => {
		stopLockStatePolling();
		lockStatePollTimer.value = window.setInterval(pollLockState, LOCK_STATE_POLL_INTERVAL);
	};

	addBeforeUnloadHandler(() => {
		// Notify that workflow is closed straight away
		notifyWorkflowClosed();
		if (uiStore.stateIsDirty) {
			// If user decided to stay on the page we notify that the workflow is opened again
			unloadTimeout.value = setTimeout(() => notifyWorkflowOpened, 5 * TIME.SECOND);
		}
	});

	function recordActivity() {
		lastActivityTime.value = Date.now();
	}

	function requestWriteAccess() {
		if (isCurrentUserWriter.value) {
			return true;
		}

		try {
			pushStore.send({
				type: 'writeAccessRequested',
				workflowId: workflowsStore.workflowId,
			});
		} catch {
			return false;
		}

		return true;
	}

	function releaseWriteAccess() {
		currentWriterId.value = null;
		stopWriteLockHeartbeat();

		try {
			pushStore.send({
				type: 'writeAccessReleaseRequested',
				workflowId: workflowsStore.workflowId,
			});
			return true;
		} catch {
			return false;
		}
	}

	function checkInactivity() {
		if (!isCurrentUserWriter.value) return;

		// Don't release write lock while AI Builder is streaming
		if (builderStore.streaming) {
			return;
		}

		const timeSinceActivity = Date.now() - lastActivityTime.value;

		if (timeSinceActivity >= INACTIVITY_TIMEOUT_THRESHOLD) {
			releaseWriteAccess();
		}
	}

	function stopInactivityCheck() {
		if (activityCheckInterval.value !== null) {
			clearInterval(activityCheckInterval.value);
			activityCheckInterval.value = null;
		}
	}

	function startInactivityCheck() {
		stopInactivityCheck();
		activityCheckInterval.value = window.setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);
	}

	function setRefreshCanvasCallback(fn: (workflow: IWorkflowDb) => void) {
		refreshCanvasCallback = fn;
	}

	async function handleWorkflowUpdate() {
		if (isCurrentUserWriter.value) {
			return;
		}

		try {
			// Fetch the latest workflow data
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowsStore.workflowId);

			// Refresh the canvas with the new workflow data
			if (refreshCanvasCallback) {
				refreshCanvasCallback(updatedWorkflow);
			}
			return true;
		} catch {
			return false;
		}
	}

	function handleWriteLockHolderLeft() {
		if (!currentWriterId.value) return;

		const writerStillPresent = collaborators.value.some((c) => c.user.id === currentWriterId.value);

		if (!writerStillPresent) {
			currentWriterId.value = null;
		}
	}

	async function initialize() {
		if (pushStoreEventListenerRemovalFn.value) {
			return;
		}

		// Fetch current write-lock state from backend to restore state after page refresh
		const writeLockUserId = await fetchWriteLockState();
		if (writeLockUserId) {
			currentWriterId.value = writeLockUserId;

			// If current user holds the lock, restart the heartbeat
			if (isCurrentUserWriter.value) {
				startWriteLockHeartbeat();
			} else {
				// If someone else has the lock, start polling
				startLockStatePolling();
			}
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (
				event.type === 'collaboratorsChanged' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				collaborators.value = event.data.collaborators;
				handleWriteLockHolderLeft();
				return;
			}

			if (
				event.type === 'writeAccessAcquired' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				currentWriterId.value = event.data.userId;

				// Start heartbeat and record activity if current user acquired the lock
				if (isCurrentUserWriter.value) {
					recordActivity();
					startWriteLockHeartbeat();
					stopLockStatePolling();
				} else {
					// Start polling if someone else has the lock
					startLockStatePolling();
				}
				return;
			}

			if (
				event.type === 'writeAccessReleased' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				currentWriterId.value = null;
				stopWriteLockHeartbeat();
				stopLockStatePolling();
				return;
			}

			if (event.type === 'workflowUpdated' && event.data.workflowId === workflowsStore.workflowId) {
				void handleWorkflowUpdate();
				return;
			}
		});

		addBeforeUnloadEventBindings();
		notifyWorkflowOpened();
		startHeartbeat();
		startInactivityCheck();
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		notifyWorkflowClosed();
		stopHeartbeat();
		stopWriteLockHeartbeat();
		stopLockStatePolling();
		stopInactivityCheck();
		if (isCurrentUserWriter.value) {
			releaseWriteAccess();
		}
		pushStore.clearQueue();
		removeBeforeUnloadEventBindings();
		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}
	}

	return {
		collaborators,
		currentWriter,
		isCurrentUserWriter,
		isAnyoneWriting,
		shouldBeReadOnly,
		requestWriteAccess,
		releaseWriteAccess,
		recordActivity,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		setRefreshCanvasCallback,
	};
});
