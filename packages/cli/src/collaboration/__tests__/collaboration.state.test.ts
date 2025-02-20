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
		it('should add workflow user with correct cache key and value', async () => {
			// Arrange
			global.Date = mockDateFactory('2023-01-01T00:00:00.000Z');

			// Act
			await collaborationState.addCollaborator(workflowId, 'userId');

			// Assert
			expect(mockCacheService.setHash).toHaveBeenCalledWith('collaboration:workflow', {
				userId: '2023-01-01T00:00:00.000Z',
			});
		});
	});

	describe('removeCollaborator', () => {
		it('should remove workflow user with correct cache key', async () => {
			// Act
			await collaborationState.removeCollaborator(workflowId, 'userId');

			// Assert
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'userId',
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

		it('should get workflow users that are not expired', async () => {
			// Arrange
			const nowMinus16Minutes = new Date();
			nowMinus16Minutes.setMinutes(nowMinus16Minutes.getMinutes() - 16);
			const now = new Date().toISOString();

			mockCacheService.getHash.mockResolvedValueOnce({
				expiredUserId: nowMinus16Minutes.toISOString(),
				notExpiredUserId: now,
			});

			// Act
			const users = await collaborationState.getCollaborators(workflowId);

			// Assert
			expect(users).toEqual([
				{
					lastSeen: now,
					userId: 'notExpiredUserId',
				},
			]);
			// removes expired users from the cache
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'expiredUserId',
			);
		});
	});
});
