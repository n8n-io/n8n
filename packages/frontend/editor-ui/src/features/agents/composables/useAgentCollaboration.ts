import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUsersStore } from '@/stores/users.store';
import { useRestApi } from '@/composables/useRestApi';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import type { AgentCollaborationState, AgentPresence } from '../types';

interface RouteParams {
	projectId: string;
	agentId: string;
}

/**
 * Composable for real-time agent collaboration.
 *
 * Manages:
 * - Joining/leaving agent editing sessions
 * - Real-time presence tracking
 * - Cursor position updates
 * - Receiving collaboration events via WebSocket
 */
export function useAgentCollaboration(agentId?: string, projectId?: string) {
	const route = useRoute();
	const usersStore = useUsersStore();
	const restApi = useRestApi();
	const pushStore = usePushConnectionStore();

	// Use provided agentId or extract from route
	const currentAgentId = ref(agentId || (route.params.agentId as string));
	const currentProjectId = ref(projectId || (route.params.projectId as string) || '');

	// Build API path with projectId
	const apiPath = computed(() => {
		return currentProjectId.value ? `/projects/${currentProjectId.value}/agent-collaboration` : '/agent-collaboration';
	});

	// Collaboration state
	const isActive = ref(false);
	const activeUsers = ref<string[]>([]);
	const userCount = ref(0);
	const cursorPositions = ref<Map<string, { x: number; y: number }>>(new Map());
	const currentUserName = ref('');

	// Loading states
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	// Computed properties
	const hasActiveUsers = computed(() => userCount.value > 1);
	const otherUsers = computed(() =>
		activeUsers.value.filter(userId => userId !== usersStore.currentUserId)
	);

	/**
	 * Join the agent collaboration session
	 */
	async function joinSession() {
		if (!currentAgentId.value || isActive.value) return;

		isLoading.value = true;
		error.value = null;

		try {
			const currentUser = usersStore.currentUser;
			currentUserName.value = currentUser?.firstName || currentUser?.email || 'Anonymous';

			const response = await restApi.post(
				`${apiPath.value}/${currentAgentId.value}/join`,
				{ userName: currentUserName.value },
			);

			if (response.success) {
				isActive.value = true;
				activeUsers.value = response.activeUsers || [];
				userCount.value = activeUsers.value.length;
			}
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to join collaboration session';
			console.error('Failed to join agent collaboration:', err);
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Leave the agent collaboration session
	 */
	async function leaveSession() {
		if (!currentAgentId.value || !isActive.value) return;

		try {
			await restApi.delete(`${apiPath.value}/${currentAgentId.value}/leave`);
			isActive.value = false;
			activeUsers.value = [];
			userCount.value = 0;
			cursorPositions.value.clear();
		} catch (err) {
			console.error('Failed to leave agent collaboration:', err);
		}
	}

	/**
	 * Update current user's cursor position
	 */
	async function updateCursorPosition(x: number, y: number) {
		if (!currentAgentId.value || !isActive.value) return;

		try {
			await restApi.post(`${apiPath.value}/${currentAgentId.value}/cursor`, { x, y });
			cursorPositions.value.set(usersStore.currentUserId, { x, y });
		} catch (err) {
			console.error('Failed to update cursor position:', err);
		}
	}

	/**
	 * Fetch current active users
	 */
	async function fetchActiveUsers() {
		if (!currentAgentId.value) return;

		try {
			const response = await restApi.get(`${apiPath.value}/${currentAgentId.value}/users`);
			activeUsers.value = response.activeUsers || [];
			userCount.value = response.userCount || 0;
		} catch (err) {
			console.error('Failed to fetch active users:', err);
		}
	}

	/**
	 * Fetch cursor positions
	 */
	async function fetchCursorPositions() {
		if (!currentAgentId.value) return;

		try {
			const response = await restApi.get(`${apiPath.value}/${currentAgentId.value}/cursors`);
			const cursors = response.cursors || {};
			cursorPositions.value = new Map(Object.entries(cursors));
		} catch (err) {
			console.error('Failed to fetch cursor positions:', err);
		}
	}

	/**
	 * Handle incoming WebSocket collaboration messages
	 */
	function handleCollaborationMessage(message: unknown) {
		if (!message || typeof message !== 'object') return;

		// Messages come as { type, data } structure from push service
		const pushMessage = message as { type: string; data: unknown };

		// Only process agent collaboration messages
		if (pushMessage.type !== 'agent-collaboration' && pushMessage.type !== 'agent-presence') {
			return;
		}

		// Extract the actual collaboration message from data
		const collabMessage = pushMessage.data as {
			type: 'agent-collaboration' | 'agent-presence';
			agentId: string;
			payload: unknown;
		};

		// Only process messages for current agent
		if (collabMessage.agentId !== currentAgentId.value) return;

		if (collabMessage.type === 'agent-presence' && collabMessage.payload) {
			const payload = collabMessage.payload as {
				type: 'user-joined' | 'user-left' | 'cursor-update';
				userId: string;
				userName?: string;
				position?: { x: number; y: number };
				timestamp: number;
			};

			if (payload.type === 'user-joined') {
				if (!activeUsers.value.includes(payload.userId)) {
					activeUsers.value.push(payload.userId);
					userCount.value = activeUsers.value.length;
				}
			} else if (payload.type === 'user-left') {
				const index = activeUsers.value.indexOf(payload.userId);
				if (index > -1) {
					activeUsers.value.splice(index, 1);
					userCount.value = activeUsers.value.length;
					cursorPositions.value.delete(payload.userId);
				}
			} else if (payload.type === 'cursor-update' && payload.position) {
				cursorPositions.value.set(payload.userId, payload.position);
			}
		} else if (collabMessage.type === 'agent-collaboration' && collabMessage.payload) {
			// Handle agent configuration changes
			// TODO: Dispatch to agent configuration update path for real-time sync
			// This would typically dispatch to a store or emit a custom event
			// For now, this logs the change for debugging purposes
			console.log('Agent configuration changed:', collabMessage.payload);
		}
	}

	// Lifecycle hooks
	onMounted(() => {
		if (currentAgentId.value) {
			joinSession();

			// Register WebSocket message listener
			removeListener = pushStore.addEventListener((message) => {
				handleCollaborationMessage(message);
			});
		}
	});

	let removeListener: (() => void) | null = null;

	onUnmounted(() => {
		// Remove message listener first to avoid race condition
		if (removeListener) {
			removeListener();
			removeListener = null;
		}

		leaveSession();
	});

	return {
		// State
		isActive,
		activeUsers,
		userCount,
		cursorPositions,
		currentUserName,
		isLoading,
		error,

		// Computed
		hasActiveUsers,
		otherUsers,

		// Methods
		joinSession,
		leaveSession,
		updateCursorPosition,
		fetchActiveUsers,
		fetchCursorPositions,
		handleCollaborationMessage,
	};
}