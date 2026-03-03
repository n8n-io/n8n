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
	const currentWriterLock = ref<{ userId: string; clientId: string } | null>(null);
	const lastActivityTime = ref<number>(Date.now());
	const activityCheckInterval = ref<number | null>(null);

	const heartbeatTimer = ref<number | null>(null);
	const writeLockHeartbeatTimer = ref<number | null>(null);
	const lockStatePollTimer = ref<number | null>(null);

	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	// Track the workflowId we're currently collaborating on
	// This is needed because workflowsStore.workflowId may change before terminate() is called
	const collaboratingWorkflowId = ref<string | null>(null);

	// Callback for refreshing the canvas after workflow updates
	let refreshCanvasCallback: ((workflow: IWorkflowDb) => void) | null = null;

	// Computed properties for write-lock state
	const isCurrentTabWriter = computed(() => {
		return currentWriterLock.value?.clientId === rootStore.pushRef;
	});

	const isCurrentUserWriter = computed(() => {
		return currentWriterLock.value?.userId === usersStore.currentUserId;
	});

	const currentWriter = computed(() => {
		return collaborators.value.find((c) => c.user.id === currentWriterLock.value?.userId) ?? null;
	});

	const isAnyoneWriting = computed(() => {
		return currentWriterLock.value !== null;
	});

	const shouldBeReadOnly = computed(() => {
		return isAnyoneWriting.value && !isCurrentTabWriter.value;
	});

	async function fetchWriteLockState(): Promise<{ clientId: string; userId: string } | null> {
		try {
			const { workflowId } = workflowsStore;
			if (!workflowsStore.isWorkflowSaved[workflowId]) {
				return null;
			}

			const response = await workflowsApi.getWorkflowWriteLock(
				rootStore.restApiContext,
				workflowId,
			);
			return response;
		} catch {
			return null;
		}
	}

	function notifyWorkflowOpened() {
		if (!collaboratingWorkflowId.value) return;
		pushStore.send({ type: 'workflowOpened', workflowId: collaboratingWorkflowId.value });
	}

	function notifyWorkflowClosed() {
		if (!collaboratingWorkflowId.value) return;
		pushStore.send({ type: 'workflowClosed', workflowId: collaboratingWorkflowId.value });

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
		if (!isCurrentTabWriter.value || !collaboratingWorkflowId.value) {
			stopWriteLockHeartbeat();
			return;
		}

		pushStore.send({
			type: 'writeAccessHeartbeat',
			workflowId: collaboratingWorkflowId.value,
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

		const writeLock = await fetchWriteLockState();

		// If lock is gone on backend but still exists in frontend, clear it
		if (!writeLock && currentWriterLock.value) {
			currentWriterLock.value = null;
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
		if (isCurrentTabWriter.value) {
			return true;
		}

		if (!collaboratingWorkflowId.value) {
			return false;
		}

		try {
			pushStore.send({
				type: 'writeAccessRequested',
				workflowId: collaboratingWorkflowId.value,
			});
		} catch {
			return false;
		}

		return true;
	}

	function requestWriteAccessForce() {
		if (!collaboratingWorkflowId.value) {
			return false;
		}

		try {
			pushStore.send({
				type: 'writeAccessRequested',
				workflowId: collaboratingWorkflowId.value,
				force: true,
			});
		} catch {
			return false;
		}

		return true;
	}

	function releaseWriteAccess() {
		currentWriterLock.value = null;
		stopWriteLockHeartbeat();

		if (!collaboratingWorkflowId.value) {
			return true;
		}

		try {
			pushStore.send({
				type: 'writeAccessReleaseRequested',
				workflowId: collaboratingWorkflowId.value,
			});
			return true;
		} catch {
			return false;
		}
	}

	function checkInactivity() {
		if (!isCurrentTabWriter.value) return;

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
		if (isCurrentTabWriter.value || !collaboratingWorkflowId.value) {
			return;
		}

		try {
			// Fetch the latest workflow data
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(collaboratingWorkflowId.value);

			// Refresh the canvas with the new workflow data
			if (refreshCanvasCallback) {
				refreshCanvasCallback(updatedWorkflow);
			}
			return true;
		} catch (error) {
			console.error('[Collaboration] Error in handleWorkflowUpdate:', error);
			return false;
		}
	}

	function handleWriteLockHolderLeft() {
		if (!currentWriterLock.value) return;

		const writerStillPresent = collaborators.value.some(
			(c) => c.user.id === currentWriterLock.value?.userId,
		);

		if (!writerStillPresent) {
			currentWriterLock.value = null;
		}
	}

	async function initialize() {
		if (pushStoreEventListenerRemovalFn.value) {
			return;
		}

		// Store the workflowId we're collaborating on
		collaboratingWorkflowId.value = workflowsStore.workflowId;

		// Fetch current write-lock state from backend to restore state after page refresh
		const writeLock = await fetchWriteLockState();
		if (writeLock) {
			currentWriterLock.value = writeLock;

			// If current tab holds the lock, restart the heartbeat
			if (isCurrentTabWriter.value) {
				startWriteLockHeartbeat();
			} else {
				// If someone else has the lock, start polling
				startLockStatePolling();
			}
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (
				event.type === 'collaboratorsChanged' &&
				event.data.workflowId === collaboratingWorkflowId.value
			) {
				collaborators.value = event.data.collaborators;
				handleWriteLockHolderLeft();
				return;
			}

			if (
				event.type === 'writeAccessAcquired' &&
				event.data.workflowId === collaboratingWorkflowId.value
			) {
				currentWriterLock.value = {
					clientId: event.data.clientId,
					userId: event.data.userId,
				};

				// Start heartbeat and record activity if current tab acquired the lock
				if (isCurrentTabWriter.value) {
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
				event.data.workflowId === collaboratingWorkflowId.value
			) {
				currentWriterLock.value = null;
				stopWriteLockHeartbeat();
				stopLockStatePolling();
				return;
			}

			if (
				event.type === 'workflowUpdated' &&
				event.data.workflowId === collaboratingWorkflowId.value
			) {
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
		if (isCurrentTabWriter.value) {
			releaseWriteAccess();
		}
		pushStore.clearQueue();
		removeBeforeUnloadEventBindings();
		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}
		collaboratingWorkflowId.value = null;
		currentWriterLock.value = null;
		collaborators.value = [];
	}

	return {
		collaborators,
		currentWriter,
		isCurrentTabWriter,
		isCurrentUserWriter,
		isAnyoneWriting,
		shouldBeReadOnly,
		requestWriteAccess,
		requestWriteAccessForce,
		releaseWriteAccess,
		recordActivity,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		setRefreshCanvasCallback,
	};
});
