import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { CollaborationState } from '../collaboration.state';

const origDate = global.Date;

const mockDateFactory = (currentDate: string) => {
	return class CustomDate extends origDate {
		constructor() {
			super(currentDate);
		}
	} as DateConstructor;
};

describe('CollaborationState', () => {
	let collaborationState: CollaborationState;
	let mockCacheService: Mocked<CacheService>;

	beforeEach(() => {
		mockCacheService = mock<CacheService>();
		collaborationState = new CollaborationState(mockCacheService);
	});

	afterEach(() => {
		global.Date = origDate;
	});

	const workflowId = 'workflow';

	describe('addCollaborator', () => {
		it('should add workflow client with correct cache key and value', async () => {
			// Arrange
			global.Date = mockDateFactory('2023-01-01T00:00:00.000Z');

			// Act
			await collaborationState.addCollaborator(workflowId, 'userId', 'clientId');

			// Assert
			expect(mockCacheService.setHash).toHaveBeenCalledWith('collaboration:workflow', {
				clientId: 'userId|2023-01-01T00:00:00.000Z',
			});
		});
	});

	describe('removeCollaborator', () => {
		it('should remove workflow client with correct cache key', async () => {
			// Act
			await collaborationState.removeCollaborator(workflowId, 'clientId');

			// Assert
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'clientId',
			);
		});
	});

	describe('getCollaborators', () => {
		it('should get workflows with correct cache key', async () => {
			// Act
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert
			expect(mockCacheService.getHash).toHaveBeenCalledWith('collaboration:workflow');
			expect(users).toBeEmptyArray();
		});

		it('should get workflow collaborators that are not expired', async () => {
			// Arrange
			const nowMinus16Minutes = new Date();
			nowMinus16Minutes.setMinutes(nowMinus16Minutes.getMinutes() - 16);
			const now = new Date().toISOString();

			mockCacheService.getHash.mockResolvedValueOnce({
				expiredClientId: `expiredUserId|${nowMinus16Minutes.toISOString()}`,
				activeClientId: `activeUserId|${now}`,
			});

			// Act
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert
			expect(users).toEqual([
				{
					clientId: 'activeClientId',
					lastSeen: now,
					userId: 'activeUserId',
				},
			]);
			// removes expired clients from the cache
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'expiredClientId',
			);
		});

		it('should deduplicate multiple tabs for the same user', async () => {
			// Arrange
			const now = new Date();
			const recentTime = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
			const olderTime = new Date(now.getTime() - 120000).toISOString(); // 2 minutes ago

			mockCacheService.getHash.mockResolvedValueOnce({
				clientId1: `user1|${recentTime}`,
				clientId2: `user1|${olderTime}`,
			});

			// Act
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert
			// Should only return one entry for user1, with the most recent timestamp
			expect(users).toHaveLength(1);
			expect(users[0]).toEqual({
				clientId: 'clientId1',
				lastSeen: recentTime,
				userId: 'user1',
			});
		});

		it('should gracefully ignore old cache format and clean it up', async () => {
			// Arrange
			const now = new Date().toISOString();

			mockCacheService.getHash.mockResolvedValueOnce({
				'old-user-uuid': '2026-02-26T21:23:36.318Z',
				newClientId: `new-user-uuid|${now}`,
			});

			// Act
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert
			expect(users).toEqual([
				{
					clientId: 'newClientId',
					lastSeen: now,
					userId: 'new-user-uuid',
				},
			]);

			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'old-user-uuid',
			);
		});
	});

	// Agent-scoped collaboration mirrors the workflow methods under distinct
	// cache keys so workflow and agent locks never collide on a shared cache.
	describe('agent collaborators', () => {
		const agentId = 'agent-1';

		it('adds an agent collaborator under the agent cache key', async () => {
			// Arrange
			global.Date = mockDateFactory('2023-01-01T00:00:00.000Z');

			// Act
			await collaborationState.addAgentCollaborator(agentId, 'userId', 'clientId');

			// Assert
			expect(mockCacheService.setHash).toHaveBeenCalledWith('collaboration:agent:agent-1', {
				clientId: 'userId|2023-01-01T00:00:00.000Z',
			});
		});

		it('removes an agent collaborator under the agent cache key', async () => {
			// Act
			await collaborationState.removeAgentCollaborator(agentId, 'clientId');

			// Assert
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:agent:agent-1',
				'clientId',
			);
		});

		it('reads agent collaborators under the agent cache key', async () => {
			// Act
			const users = await collaborationState.getAgentCollaborators(agentId);

			// Assert
			expect(mockCacheService.getHash).toHaveBeenCalledWith('collaboration:agent:agent-1');
			expect(users).toBeEmptyArray();
		});
	});

	describe('agent write lock', () => {
		const agentId = 'agent-1';

		it('sets the agent write lock under the agent lock key', async () => {
			// Act
			await collaborationState.setAgentWriteLock(agentId, 'clientId', 'userId');

			// Assert
			expect(mockCacheService.set).toHaveBeenCalledWith(
				'collaboration:write-lock:agent:agent-1',
				JSON.stringify({ clientId: 'clientId', userId: 'userId' }),
				collaborationState.writeLockTtl,
			);
		});

		it('reads the agent write lock under the agent lock key', async () => {
			// Arrange
			mockCacheService.get.mockResolvedValueOnce(
				JSON.stringify({ clientId: 'clientId', userId: 'userId' }),
			);

			// Act
			const lock = await collaborationState.getAgentWriteLock(agentId);

			// Assert
			expect(mockCacheService.get).toHaveBeenCalledWith('collaboration:write-lock:agent:agent-1');
			expect(lock).toEqual({ clientId: 'clientId', userId: 'userId' });
		});

		it('releases the agent write lock under the agent lock key', async () => {
			// Act
			await collaborationState.releaseAgentWriteLock(agentId);

			// Assert
			expect(mockCacheService.delete).toHaveBeenCalledWith(
				'collaboration:write-lock:agent:agent-1',
			);
		});

		it('force-acquires the agent write lock only when the same user holds it', async () => {
			// Arrange — a different user holds the lock
			mockCacheService.get.mockResolvedValueOnce(
				JSON.stringify({ clientId: 'otherClient', userId: 'otherUser' }),
			);

			// Act
			const acquired = await collaborationState.acquireAgentWriteLockForce(
				agentId,
				'clientId',
				'userId',
			);

			// Assert
			expect(acquired).toBe(false);
			expect(mockCacheService.set).not.toHaveBeenCalled();
		});

		it('force-acquires the agent write lock when the same user holds it from another tab', async () => {
			// Arrange — same user, different client
			mockCacheService.get.mockResolvedValueOnce(
				JSON.stringify({ clientId: 'otherClient', userId: 'userId' }),
			);

			// Act
			const acquired = await collaborationState.acquireAgentWriteLockForce(
				agentId,
				'clientId',
				'userId',
			);

			// Assert
			expect(acquired).toBe(true);
			expect(mockCacheService.set).toHaveBeenCalledWith(
				'collaboration:write-lock:agent:agent-1',
				JSON.stringify({ clientId: 'clientId', userId: 'userId' }),
				collaborationState.writeLockTtl,
			);
		});
	});
});
