import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useAgentCollaboration } from '../useAgentCollaboration';

describe('useAgentCollaboration', () => {
	let mockRestApi: any;
	let mockPushStore: any;
	let mockUsersStore: any;

	beforeEach(() => {
		mockRestApi = {
			post: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
		};

		mockPushStore = {
			addEventListener: vi.fn(() => vi.fn()),
		};

		mockUsersStore = {
			currentUserId: 'user-123',
			currentUser: {
				id: 'user-123',
				firstName: 'Test',
				email: 'test@example.com',
			},
			getUserById: vi.fn((id: string) => ({
				id,
				firstName: `User${id}`,
				email: `user${id}@example.com`,
			})),
		};

		vi.mock('@/composables/useRestApi', () => ({
			useRestApi: () => mockRestApi,
		}));

		vi.mock('@/app/stores/pushConnection.store', () => ({
			usePushConnectionStore: () => mockPushStore,
		}));

		vi.mock('@/stores/users.store', () => ({
			useUsersStore: () => mockUsersStore,
		}));
	});

	describe('joinSession', () => {
		it('should join collaboration session successfully', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.post.mockResolvedValue({
				success: true,
				activeUsers: ['user-123', 'user-456'],
			});

			const { joinSession, isActive, activeUsers, userCount } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			await joinSession();

			expect(mockRestApi.post).toHaveBeenCalledWith(
				`/projects/${projectId}/agent-collaboration/${agentId}/join`,
				{ userName: 'Test' },
			);
			expect(isActive.value).toBe(true);
			expect(activeUsers.value).toEqual(['user-123', 'user-456']);
			expect(userCount.value).toBe(2);
		});

		it('should handle join errors', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.post.mockRejectedValue(new Error('Network error'));

			const { joinSession, error } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			await joinSession();

			expect(error.value).toBe('Network error');
		});
	});

	describe('leaveSession', () => {
		it('should leave collaboration session successfully', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.delete.mockResolvedValue(undefined);

			const { leaveSession, isActive, activeUsers, userCount } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			// Set as active first
			activeUsers.value = ['user-123'];
			userCount.value = 1;
			isActive.value = true;

			await leaveSession();

			expect(mockRestApi.delete).toHaveBeenCalledWith(
				`/projects/${projectId}/agent-collaboration/${agentId}/leave`,
			);
			expect(isActive.value).toBe(false);
			expect(activeUsers.value).toEqual([]);
			expect(userCount.value).toBe(0);
		});
	});

	describe('updateCursorPosition', () => {
		it('should update cursor position successfully', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.post.mockResolvedValue(undefined);

			const { updateCursorPosition, cursorPositions, isActive } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			// Set as active first
			isActive.value = true;

			await updateCursorPosition(100, 200);

			expect(mockRestApi.post).toHaveBeenCalledWith(
				`/projects/${projectId}/agent-collaboration/${agentId}/cursor`,
				{ x: 100, y: 200 },
			);
			expect(cursorPositions.value.get('user-123')).toEqual({ x: 100, y: 200 });
		});

		it('should not update if not active', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			const { updateCursorPosition } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			await updateCursorPosition(100, 200);

			expect(mockRestApi.post).not.toHaveBeenCalled();
		});
	});

	describe('fetchActiveUsers', () => {
		it('should fetch active users successfully', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.get.mockResolvedValue({
				activeUsers: ['user-123', 'user-456'],
				userCount: 2,
			});

			const { fetchActiveUsers, activeUsers, userCount } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			await fetchActiveUsers();

			expect(mockRestApi.get).toHaveBeenCalledWith(
				`/projects/${projectId}/agent-collaboration/${agentId}/users`,
			);
			expect(activeUsers.value).toEqual(['user-123', 'user-456']);
			expect(userCount.value).toBe(2);
		});
	});

	describe('fetchCursorPositions', () => {
		it('should fetch cursor positions successfully', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			mockRestApi.get.mockResolvedValue({
				cursors: {
					'user-123': { x: 100, y: 200 },
					'user-456': { x: 300, y: 400 },
				},
			});

			const { fetchCursorPositions, cursorPositions } = useAgentCollaboration(
				computed(() => agentId),
				computed(() => projectId),
			);

			await fetchCursorPositions();

			expect(mockRestApi.get).toHaveBeenCalledWith(
				`/projects/${projectId}/agent-collaboration/${agentId}/cursors`,
			);
			expect(cursorPositions.value.get('user-123')).toEqual({ x: 100, y: 200 });
			expect(cursorPositions.value.get('user-456')).toEqual({ x: 300, y: 400 });
		});
	});

	describe('computed properties', () => {
		it('should compute hasActiveUsers correctly', () => {
			const { userCount, hasActiveUsers } = useAgentCollaboration(
				computed(() => 'agent-456'),
				computed(() => 'project-789'),
			);

			userCount.value = 0;
			expect(hasActiveUsers.value).toBe(false);

			userCount.value = 1;
			expect(hasActiveUsers.value).toBe(false);

			userCount.value = 2;
			expect(hasActiveUsers.value).toBe(true);
		});

		it('should compute otherUsers correctly', () => {
			const { activeUsers, otherUsers } = useAgentCollaboration(
				computed(() => 'agent-456'),
				computed(() => 'project-789'),
			);

			activeUsers.value = ['user-123', 'user-456'];
			expect(otherUsers.value).toEqual(['user-456']);

			activeUsers.value = ['user-123'];
			expect(otherUsers.value).toEqual([]);
		});
	});
});
