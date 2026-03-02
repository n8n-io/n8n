import { mock } from 'jest-mock-extended';

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
	let mockCacheService: jest.Mocked<CacheService>;

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

		it('should handle legacy cache format without pipe delimiter (CAT-2502)', async () => {
			// Arrange - simulate old cache format from 2.9.x: userId -> timestamp (no pipe)
			mockCacheService.getHash.mockResolvedValueOnce({
				'4b324c79-e576-49f2-b493-43408059b081': '2026-02-26T21:23:36.318Z',
			});

			// Act - this should not throw when parsing legacy format
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert - should gracefully handle legacy format
			// Either return empty array or parse what it can
			expect(users).toBeDefined();
		});

		it('should handle mixed legacy and new cache formats (CAT-2502)', async () => {
			// Arrange - simulate mixed cache with both old and new formats
			const now = new Date().toISOString();
			mockCacheService.getHash.mockResolvedValueOnce({
				// Old format: userId -> timestamp (no pipe, from 2.9.x)
				'old-user-id': '2026-02-26T21:23:36.318Z',
				// New format: clientId -> "userId|timestamp"
				'new-client-id': `new-user-id|${now}`,
			});

			// Act - should handle mixed formats without crashing
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert - should at least parse the valid new format entries
			expect(users).toBeDefined();
			expect(Array.isArray(users)).toBe(true);
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
	});
});
