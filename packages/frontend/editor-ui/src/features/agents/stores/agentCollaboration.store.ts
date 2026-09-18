import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Collaborator } from '@n8n/api-types';

import { TIME } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { ResponseError } from '@n8n/rest-api-client';

import { getAgentWriteLock } from '../composables/useAgentApi';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;
const WRITE_LOCK_HEARTBEAT_INTERVAL = 30 * TIME.SECOND;
const LOCK_STATE_POLL_INTERVAL = 20 * TIME.SECOND;
const INACTIVITY_CHECK_INTERVAL = 5 * TIME.SECOND;
const INACTIVITY_TIMEOUT_THRESHOLD = 20 * TIME.SECOND;

/**
 * Store for tracking the agent builder write lock and active collaborators.
 * Mirrors the workflow collaboration store without the canvas/dirty-state
 * machinery — the agent builder has its own autosave loop.
 */
export const useAgentCollaborationStore = defineStore(STORES.AGENT_COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();

	const collaborators = ref<Collaborator[]>([]);
	const currentWriterLock = ref<{ userId: string; clientId: string } | null>(null);
	// True between requesting the lock and receiving writeAccessAcquired.
	// Keeps the tab read-only until it actually holds the lock, so a
	// released/expired lock does not make every tab writable at once.
	const isRequestingWriteAccess = ref(false);

	const lastActivityTime = ref<number>(Date.now());
	const activityCheckInterval = ref<number | null>(null);

	const heartbeatTimer = ref<number | null>(null);
	const writeLockHeartbeatTimer = ref<number | null>(null);
	const lockStatePollTimer = ref<number | null>(null);

	// Once a write-lock fetch fails with a 401, every future poll from this tab
	// will fail the same way, while push events (delivered over the still-open
	// websocket) keep re-arming the poller. Suspend polling until the store is
	// re-initialized to avoid a sustained stream of failing requests.
	let lockStatePollingSuspended = false;

	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	const collaboratingAgentId = ref<string | null>(null);

	const isCurrentTabWriter = computed(
		() => currentWriterLock.value?.clientId === rootStore.pushRef,
	);

	const isCurrentUserWriter = computed(
		() => currentWriterLock.value?.userId === usersStore.currentUserId,
	);

	const currentWriter = computed(
		() => collaborators.value.find((c) => c.user.id === currentWriterLock.value?.userId) ?? null,
	);

	const isAnyoneWriting = computed(() => currentWriterLock.value !== null);

	const shouldBeReadOnly = computed(
		() => (isAnyoneWriting.value || isRequestingWriteAccess.value) && !isCurrentTabWriter.value,
	);

	async function fetchWriteLockState(
		projectId: string,
		agentId: string,
	): Promise<{ clientId: string; userId: string } | null> {
		try {
			return await getAgentWriteLock(rootStore.restApiContext, projectId, agentId);
		} catch (error) {
			if (error instanceof ResponseError && error.httpStatusCode === 401) {
				lockStatePollingSuspended = true;
				stopLockStatePolling();
			}
			return null;
		}
	}

	function notifyAgentOpened() {
		if (!collaboratingAgentId.value) return;
		pushStore.send({ type: 'agentOpened', agentId: collaboratingAgentId.value });
	}

	function notifyAgentClosed() {
		if (!collaboratingAgentId.value) return;
		pushStore.send({ type: 'agentClosed', agentId: collaboratingAgentId.value });

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
		heartbeatTimer.value = window.setInterval(notifyAgentOpened, HEARTBEAT_INTERVAL);
	};

	const stopWriteLockHeartbeat = () => {
		if (writeLockHeartbeatTimer.value !== null) {
			clearInterval(writeLockHeartbeatTimer.value);
			writeLockHeartbeatTimer.value = null;
		}
	};

	const sendWriteLockHeartbeat = () => {
		if (!isCurrentTabWriter.value || !collaboratingAgentId.value) {
			stopWriteLockHeartbeat();
			return;
		}

		pushStore.send({
			type: 'agentWriteAccessHeartbeat',
			agentId: collaboratingAgentId.value,
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

	const pollLockState = async (projectId: string, agentId: string) => {
		if (!shouldBeReadOnly.value) {
			stopLockStatePolling();
			return;
		}

		const writeLock = await fetchWriteLockState(projectId, agentId);

		// The poll captures agentId at call time. If the view switched to a
		// different agent during the await, the response is stale and must
		// not mutate the new agent's lock state.
		if (collaboratingAgentId.value !== agentId) {
			return;
		}

		// If lock is gone on backend but still exists in frontend, clear it
		// and request the lock so this tab becomes the next writer.
		if (!writeLock && currentWriterLock.value) {
			currentWriterLock.value = null;
			stopLockStatePolling();
			requestWriteAccess();
		}
	};

	const startLockStatePolling = (projectId: string, agentId: string) => {
		if (lockStatePollingSuspended) {
			return;
		}
		stopLockStatePolling();
		lockStatePollTimer.value = window.setInterval(
			async () => await pollLockState(projectId, agentId),
			LOCK_STATE_POLL_INTERVAL,
		);
	};

	function recordActivity() {
		lastActivityTime.value = Date.now();
	}

	function checkInactivity() {
		if (!isCurrentTabWriter.value) return;

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

	function requestWriteAccess() {
		if (isCurrentTabWriter.value) {
			return true;
		}

		if (!collaboratingAgentId.value) {
			return false;
		}

		isRequestingWriteAccess.value = true;

		try {
			pushStore.send({
				type: 'agentWriteAccessRequested',
				agentId: collaboratingAgentId.value,
			});
		} catch {
			// send threw (e.g. WebSocket tearing down). Reset the pending
			// flag so the tab is not trapped read-only — the lock-state
			// poll will re-request once the connection recovers.
			isRequestingWriteAccess.value = false;
			return false;
		}

		return true;
	}

	function requestWriteAccessForce() {
		if (!collaboratingAgentId.value) {
			return false;
		}

		try {
			pushStore.send({
				type: 'agentWriteAccessRequested',
				agentId: collaboratingAgentId.value,
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

		if (!collaboratingAgentId.value) {
			return true;
		}

		try {
			pushStore.send({
				type: 'agentWriteAccessReleaseRequested',
				agentId: collaboratingAgentId.value,
			});
			return true;
		} catch {
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

	async function initialize(projectId: string, agentId: string) {
		if (pushStoreEventListenerRemovalFn.value) {
			if (collaboratingAgentId.value === agentId) {
				return;
			}
			// The builder view is reused across agents (in-place route change),
			// so release the previous agent's lock before binding to the new one.
			terminate();
		}

		collaboratingAgentId.value = agentId;
		lockStatePollingSuspended = false;

		// Fetch current write-lock state from backend to restore state after page refresh
		const writeLock = await fetchWriteLockState(projectId, agentId);

		// If terminate() was called while we were fetching (view unmounted or
		// agent switched), don't continue — the store is no longer bound to
		// this agent. Without this guard, initialization resumes after the
		// await, rebinds the singleton, sends agentOpened, acquires the lock,
		// and keeps renewing it via heartbeat after the tab is gone.
		if (collaboratingAgentId.value !== agentId) {
			return;
		}

		if (writeLock) {
			currentWriterLock.value = writeLock;

			if (isCurrentTabWriter.value) {
				startWriteLockHeartbeat();
			} else {
				startLockStatePolling(projectId, agentId);
			}
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (
				event.type === 'collaboratorsChanged' &&
				event.data.agentId === collaboratingAgentId.value
			) {
				collaborators.value = event.data.collaborators;
				handleWriteLockHolderLeft();
				return;
			}

			if (
				event.type === 'writeAccessAcquired' &&
				event.data.agentId === collaboratingAgentId.value
			) {
				isRequestingWriteAccess.value = false;
				currentWriterLock.value = {
					clientId: event.data.clientId,
					userId: event.data.userId,
				};

				if (isCurrentTabWriter.value) {
					recordActivity();
					startWriteLockHeartbeat();
					stopLockStatePolling();
				} else {
					startLockStatePolling(projectId, agentId);
				}
				return;
			}

			if (
				event.type === 'writeAccessReleased' &&
				event.data.agentId === collaboratingAgentId.value
			) {
				currentWriterLock.value = null;
				stopWriteLockHeartbeat();
				stopLockStatePolling();
				// The lock is gone — request it immediately so this tab becomes the
				// next writer instead of leaving every tab writable with no lock.
				requestWriteAccess();
				return;
			}
		});

		notifyAgentOpened();
		startHeartbeat();
		startInactivityCheck();
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		// Clear stale queued messages (heartbeats, etc.) BEFORE sending
		// the cleanup messages. If the connection is down, the close and
		// release messages are queued and must survive so they are delivered on reconnect.
		pushStore.clearQueue();
		notifyAgentClosed();
		stopHeartbeat();
		stopWriteLockHeartbeat();
		stopLockStatePolling();
		stopInactivityCheck();
		if (isCurrentTabWriter.value) {
			releaseWriteAccess();
		}
		collaboratingAgentId.value = null;
		currentWriterLock.value = null;
		isRequestingWriteAccess.value = false;
		collaborators.value = [];
		lockStatePollingSuspended = false;
	}

	return {
		collaborators,
		currentWriter,
		currentWriterLock,
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
	};
});
