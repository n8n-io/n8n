import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUsersStore } from '@/stores/users.store';
import { useRestApi } from '@/composables/useRestApi';
import type { AgentCollaborationState, AgentPresence } from '../types';

/**
 * Composable for real-time agent collaboration.
 * 
 * Manages:
 * - Joining/leaving agent editing sessions
 * - Real-time presence tracking
 * - Cursor position updates
 * - Receiving collaboration events via WebSocket
 */
export function useAgentCollaboration(agentId?: string) {
	const route = useRoute();
	const usersStore = useUsersStore();
	const restApi = useRestApi();

	// Use provided agentId or extract from route
	const currentAgentId = ref(agentId || (route.params.agentId as string));

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
				`/agent-collaboration/${currentAgentId.value}/join`,
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
			await restApi.delete(`/agent-collaboration/${currentAgentId.value}/leave`);
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
			await restApi.post(`/agent-collaboration/${currentAgentId.value}/cursor`, { x, y });
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
			const response = await restApi.get(`/agent-collaboration/${currentAgentId.value}/users`);
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
			const response = await restApi.get(`/agent-collaboration/${currentAgentId.value}/cursors`);
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

		const msg = message as { type: string; agentId: string; payload: unknown };

		// Only process messages for current agent
		if (msg.agentId !== currentAgentId.value) return;

		if (msg.type === 'agent-presence' && msg.payload) {
			const payload = msg.payload as {
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
		} else if (msg.type === 'agent-collaboration' && msg.payload) {
			// Handle agent configuration changes
			// This would trigger UI updates for concurrent edits
			console.log('Agent configuration changed:', msg.payload);
		}
	}

	// Lifecycle hooks
	onMounted(() => {
		if (currentAgentId.value) {
			joinSession();
			
			// Set up WebSocket message listener
			// This would integrate with the existing push connection
			// For now, we'll poll for presence updates
			const pollInterval = setInterval(() => {
				if (isActive.value) {
					fetchActiveUsers();
					fetchCursorPositions();
				}
			}, 5000); // Poll every 5 seconds as fallback

			// Store interval for cleanup
			(window as unknown)._collaborationPollInterval = pollInterval;
		}
	});

	onUnmounted(() => {
		leaveSession();
		
		// Clear polling interval
		const pollInterval = (window as unknown)._collaborationPollInterval as number;
		if (pollInterval) {
			clearInterval(pollInterval);
			delete (window as unknown)._collaborationPollInterval;
		}
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