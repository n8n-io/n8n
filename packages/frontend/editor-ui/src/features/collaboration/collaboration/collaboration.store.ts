/* eslint-disable import-x/extensions */
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Collaborator } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';

import { TIME } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { STORES } from '@n8n/stores';
import { useBeforeUnload } from '@/app/composables/useBeforeUnload';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import * as workflowsApi from '@/app/api/workflows';
import { isCrdtCollaborationEnabled } from '@/experiments/utils';

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
	const settingsStore = useSettingsStore();
	const builderStore = useBuilderStore();
	const toast = useToast();
	const i18n = useI18n();

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
	let pendingRemoteUpdateNotification: { close: () => void } | null = null;

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
		if (!isAnyoneWriting.value || isCurrentTabWriter.value) return false;
		// Server-side CRDT merges concurrent edits across browsers and users, so the
		// single-writer lock no longer applies — everyone co-edits live.
		if (settingsStore.crdtCollaborationMode === 'server') return false;
		// With cross-tab (local) CRDT, same-browser tabs sync live, so another tab of
		// the SAME user should not lock this one. A different user's lock still
		// applies (local CRDT does not sync across browsers).
		if (isCrdtCollaborationEnabled() && isCurrentUserWriter.value) return false;
		return true;
	});

	async function fetchWriteLockState(
		workflowId: string,
	): Promise<{ clientId: string; userId: string } | null> {
		try {
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
	const pollLockState = async (workflowId: string) => {
		if (!shouldBeReadOnly.value) {
			stopLockStatePolling();
			return;
		}

		const writeLock = await fetchWriteLockState(workflowId);

		// If lock is gone on backend but still exists in frontend, clear it
		if (!writeLock && currentWriterLock.value) {
			currentWriterLock.value = null;
			stopLockStatePolling();
		}
	};

	const startLockStatePolling = (workflowId: string) => {
		stopLockStatePolling();
		lockStatePollTimer.value = window.setInterval(
			async () => await pollLockState(workflowId),
			LOCK_STATE_POLL_INTERVAL,
		);
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
		// Server-side CRDT lets everyone co-edit live, so no single-writer lock is
		// acquired — report access as granted without contending for the lock.
		if (settingsStore.crdtCollaborationMode === 'server') {
			return true;
		}

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
		// No single-writer lock under server-side CRDT — nothing to force-acquire.
		if (settingsStore.crdtCollaborationMode === 'server') {
			return true;
		}

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

	function closePendingRemoteUpdateNotification() {
		pendingRemoteUpdateNotification?.close();
		pendingRemoteUpdateNotification = null;
	}

	function showPendingRemoteUpdateNotification() {
		if (pendingRemoteUpdateNotification) {
			return;
		}

		pendingRemoteUpdateNotification = toast.showMessage({
			title: i18n.baseText('workflows.remoteUpdateBlocked.title'),
			message: i18n.baseText('workflows.remoteUpdateBlocked.message'),
			type: 'warning',
			duration: 0,
			onClose: () => {
				pendingRemoteUpdateNotification = null;
			},
		});
	}

	/**
	 * Under CRDT collaboration all of a user's same-browser tabs share one live
	 * document, so a save from another of this user's tabs only advances the
	 * server-side baseline (checksum/versionId) — the content here is already in
	 * sync. Fast-forward the baseline so the next normal save doesn't spuriously
	 * 409, without refetching/replacing the canvas or warning about a conflict
	 * that doesn't exist.
	 */
	async function fastForwardWorkflowBaseline() {
		if (!collaboratingWorkflowId.value) return false;

		try {
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(collaboratingWorkflowId.value);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(collaboratingWorkflowId.value),
			);
			// Only touch the baseline of the workflow currently open in this tab.
			if (workflowDocumentStore.workflowId !== collaboratingWorkflowId.value) return false;

			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: null,
				description: null,
			});
			if (updatedWorkflow.checksum) {
				workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
			}
			return true;
		} catch (error) {
			console.error('[Collaboration] Error fast-forwarding workflow baseline:', error);
			return false;
		}
	}

	async function handleWorkflowUpdate(updatedByUserId?: string) {
		if (!collaboratingWorkflowId.value) {
			return;
		}

		// Server-side CRDT keeps ALL users' content in live sync, so any save —
		// by this user or another — only advances the persisted baseline and is
		// never a conflict here. Realign the baseline to the server's latest so
		// the next save stays current, without warning about a conflict that
		// doesn't exist or replacing the already-synced live canvas.
		if (settingsStore.crdtCollaborationMode === 'server') {
			return await fastForwardWorkflowBaseline();
		}

		// CRDT keeps this user's same-browser tabs in content sync, so any save by
		// this user is not a conflict here — including a save from a sibling tab
		// while THIS tab holds the write lock. Realign the baseline to the server's
		// latest so the next save doesn't spuriously 409. (Idempotent for our own
		// save echo.) A different user's save falls through to the normal path,
		// since CRDT does not sync across browsers and their change is real.
		if (isCrdtCollaborationEnabled() && updatedByUserId === usersStore.currentUserId) {
			return await fastForwardWorkflowBaseline();
		}

		// A normal remote save by another writer; our own save echo needs nothing.
		if (isCurrentTabWriter.value) {
			return;
		}

		// Preserve local unsaved edits until the user explicitly resolves them
		// (This state is possible when autosave is disabled)
		if (uiStore.stateIsDirty) {
			showPendingRemoteUpdateNotification();
			return true;
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

	watch(
		() => uiStore.stateIsDirty,
		(isDirty) => {
			if (!isDirty) {
				closePendingRemoteUpdateNotification();
			}
		},
		{ flush: 'sync' },
	);

	function handleWriteLockHolderLeft() {
		if (!currentWriterLock.value) return;

		const writerStillPresent = collaborators.value.some(
			(c) => c.user.id === currentWriterLock.value?.userId,
		);

		if (!writerStillPresent) {
			currentWriterLock.value = null;
		}
	}

	async function initialize(workflowId: string) {
		if (pushStoreEventListenerRemovalFn.value) {
			return;
		}

		// Store the workflowId we're collaborating on
		collaboratingWorkflowId.value = workflowId;

		// Fetch current write-lock state from backend to restore state after page refresh
		const writeLock = await fetchWriteLockState(workflowId);
		if (writeLock) {
			currentWriterLock.value = writeLock;

			// If current tab holds the lock, restart the heartbeat
			if (isCurrentTabWriter.value) {
				startWriteLockHeartbeat();
			} else {
				// If someone else has the lock, start polling
				startLockStatePolling(workflowId);
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
					startLockStatePolling(workflowId);
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
				void handleWorkflowUpdate(event.data.userId);
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
		closePendingRemoteUpdateNotification();
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
