import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Collaborator } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';

import { PLACEHOLDER_EMPTY_WORKFLOW_ID, TIME } from '@/constants';
import { STORES } from '@n8n/stores';
import { useBeforeUnload } from '@/composables/useBeforeUnload';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/api/workflows';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();

	const route = useRoute();
	const { addBeforeUnloadEventBindings, removeBeforeUnloadEventBindings, addBeforeUnloadHandler } =
		useBeforeUnload({ route });
	const unloadTimeout = ref<NodeJS.Timeout | null>(null);

	addBeforeUnloadHandler(() => {
		// Notify that workflow is closed straight away
		notifyWorkflowClosed();
		if (uiStore.stateIsDirty) {
			// If user decided to stay on the page we notify that the workflow is opened again
			unloadTimeout.value = setTimeout(() => notifyWorkflowOpened, 5 * TIME.SECOND);
		}
	});

	const collaborators = ref<Collaborator[]>([]);

	const heartbeatTimer = ref<number | null>(null);

	// Write-lock state for single-write mode
	const currentWriterId = ref<string | null>(null);
	const lastActivityTime = ref<number>(Date.now());
	const activityCheckInterval = ref<number | null>(null);

	const startHeartbeat = () => {
		stopHeartbeat();
		heartbeatTimer.value = window.setInterval(notifyWorkflowOpened, HEARTBEAT_INTERVAL);
	};

	const stopHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
	};

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

	// Write-lock methods
	function acquireWriteAccess() {
		if (isAnyoneWriting.value && !isCurrentUserWriter.value) {
			console.log('[Collaboration] ❌ Write access denied - another user is writing', {
				currentWriter: currentWriterId.value,
				requestingUser: usersStore.currentUserId,
			});
			return false;
		}

		currentWriterId.value = usersStore.currentUserId;
		lastActivityTime.value = Date.now();

		console.log('[Collaboration] 🔓 Write access acquired locally', {
			userId: usersStore.currentUserId,
			workflowId: workflowsStore.workflowId,
		});

		try {
			pushStore.send({
				type: 'writeAccessAcquired',
				workflowId: workflowsStore.workflowId,
				userId: usersStore.currentUserId,
			});
		} catch (error) {
			console.error('[Collaboration] ❌ Failed to send writeAccessAcquired message:', error);
		}

		return true;
	}

	function releaseWriteAccess() {
		if (!isCurrentUserWriter.value) {
			return;
		}

		currentWriterId.value = null;

		try {
			pushStore.send({
				type: 'writeAccessReleased',
				workflowId: workflowsStore.workflowId,
			});
		} catch (error) {
			console.error('[Collaboration] ❌ Failed to send writeAccessReleased message:', error);
		}
	}

	function recordActivity() {
		if (!isCurrentUserWriter.value) {
			return;
		}
		lastActivityTime.value = Date.now();
	}

	function checkInactivity() {
		if (!isCurrentUserWriter.value) return;

		const timeSinceActivity = Date.now() - lastActivityTime.value;
		const timeoutThreshold = 20 * TIME.SECOND;

		console.log(
			'[Collaboration] ⏱️ Time since inactivity',
			`${Math.floor(timeSinceActivity / 1000)}s`,
		);

		if (timeSinceActivity >= timeoutThreshold) {
			console.log('[Collaboration] ⏰ Inactivity timeout - releasing write access', {
				inactiveFor: `${Math.floor(timeSinceActivity / 1000)}s`,
			});
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
		activityCheckInterval.value = window.setInterval(checkInactivity, 1000);
	}

	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	async function fetchWriteLockState(): Promise<string | null> {
		try {
			const { workflowId } = workflowsStore;
			if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return null;
			}

			const response = await workflowsApi.getWorkflowWriteLock(
				rootStore.restApiContext,
				workflowId,
			);
			return response.userId;
		} catch (error) {
			console.error('[Collaboration] ❌ Failed to fetch write-lock state:', error);
			return null;
		}
	}

	// Callback for refreshing the canvas after workflow updates
	let refreshCanvasCallback: ((workflow: IWorkflowDb) => void) | null = null;

	function setRefreshCanvasCallback(fn: (workflow: IWorkflowDb) => void) {
		refreshCanvasCallback = fn;
	}

	async function handleWorkflowUpdate(versionId: string) {
		if (isCurrentUserWriter.value) {
			return;
		}

		// Only skip updates if the user has write access AND has unsaved changes
		// Readers should always receive updates since they can't make changes
		if (!shouldBeReadOnly.value && uiStore.stateIsDirty) {
			console.log('[Collaboration] ⚠️ Skipping workflow update - local changes exist');
			return;
		}

		try {
			console.log('[Collaboration] 📥 Fetching updated workflow...');
			// Fetch the latest workflow data
			const updatedWorkflow = await workflowsStore.fetchWorkflow(workflowsStore.workflowId);

			// Verify version matches
			if (updatedWorkflow.versionId !== versionId) {
				console.warn('[Collaboration] ⚠️ Version mismatch after fetch', {
					expected: versionId,
					received: updatedWorkflow.versionId,
				});
			}

			// Refresh the canvas with the new workflow data
			if (refreshCanvasCallback) {
				refreshCanvasCallback(updatedWorkflow);
			} else {
				// Fallback to just updating the store
				workflowsStore.setWorkflow(updatedWorkflow);
				workflowsStore.setWorkflowVersionId(updatedWorkflow.versionId);
			}

			console.log('[Collaboration] ✅ Workflow updated successfully', {
				versionId: updatedWorkflow.versionId,
			});
		} catch (error) {
			console.error('[Collaboration] ❌ Failed to fetch updated workflow:', error);
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
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (
				event.type === 'collaboratorsChanged' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				collaborators.value = event.data.collaborators;

				// Check if the current write lock holder left
				if (currentWriterId.value) {
					const writerStillPresent = collaborators.value.some(
						(c) => c.user.id === currentWriterId.value,
					);
					if (!writerStillPresent) {
						const wasReadOnly = shouldBeReadOnly.value;
						console.log('[Collaboration] 🔒 Write lock holder left - clearing lock', {
							writerId: currentWriterId.value,
							wasReadOnly,
						});
						currentWriterId.value = null;

						// If we were in read-only mode, refresh the canvas to exit read-only
						if (wasReadOnly && refreshCanvasCallback) {
							console.log('[Collaboration] 🔄 Refreshing canvas to exit read-only mode');
							const currentWorkflow = workflowsStore.workflow;
							refreshCanvasCallback(currentWorkflow);
						}
					}
				}
				return;
			}

			if (
				event.type === 'writeAccessAcquired' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				currentWriterId.value = event.data.userId;
				const writer = collaborators.value.find((c) => c.user.id === event.data.userId);
				console.log(
					'[Collaboration] 🔓 Write access acquired by:',
					writer?.user.email || event.data.userId,
				);
				return;
			}

			if (
				event.type === 'writeAccessReleased' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				const wasReadOnly = shouldBeReadOnly.value;
				currentWriterId.value = null;
				console.log('[Collaboration] 🔒 Write access released', {
					currentWriterId: currentWriterId.value,
					wasReadOnly,
				});

				// If we were in read-only mode, refresh the canvas to exit read-only
				if (wasReadOnly && refreshCanvasCallback) {
					console.log('[Collaboration] 🔄 Refreshing canvas to exit read-only mode');
					const currentWorkflow = workflowsStore.workflow;
					refreshCanvasCallback(currentWorkflow);
				}
				return;
			}

			if (event.type === 'workflowUpdated' && event.data.workflowId === workflowsStore.workflowId) {
				void handleWorkflowUpdate(event.data.versionId);
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

	function notifyWorkflowOpened() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({ type: 'workflowOpened', workflowId });
	}

	function notifyWorkflowClosed() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({ type: 'workflowClosed', workflowId });

		collaborators.value = collaborators.value.filter(
			({ user }) => user.id !== usersStore.currentUserId,
		);
	}

	return {
		collaborators,
		currentWriter,
		isCurrentUserWriter,
		isAnyoneWriting,
		shouldBeReadOnly,
		acquireWriteAccess,
		releaseWriteAccess,
		recordActivity,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		setRefreshCanvasCallback,
	};
});
