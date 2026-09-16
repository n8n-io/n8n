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

		// First opener acquires the lock so a second tab is read-only immediately.
		if (!currentWriterLock.value) {
			requestWriteAccess();
		}
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		notifyAgentClosed();
		stopHeartbeat();
		stopWriteLockHeartbeat();
		stopLockStatePolling();
		if (isCurrentTabWriter.value) {
			releaseWriteAccess();
		}
		pushStore.clearQueue();
		collaboratingAgentId.value = null;
		currentWriterLock.value = null;
		isRequestingWriteAccess.value = false;
		collaborators.value = [];
		lockStatePollingSuspended = false;
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
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
	};
});
