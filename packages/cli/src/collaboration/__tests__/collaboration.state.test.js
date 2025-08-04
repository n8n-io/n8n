'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const collaboration_state_1 = require('../collaboration.state');
const origDate = global.Date;
const mockDateFactory = (currentDate) => {
	return class CustomDate extends origDate {
		constructor() {
			super(currentDate);
		}
	};
};
describe('CollaborationState', () => {
	let collaborationState;
	let mockCacheService;
	beforeEach(() => {
		mockCacheService = (0, jest_mock_extended_1.mock)();
		collaborationState = new collaboration_state_1.CollaborationState(mockCacheService);
	});
	afterEach(() => {
		global.Date = origDate;
	});
	const workflowId = 'workflow';
	describe('addCollaborator', () => {
		it('should add workflow user with correct cache key and value', async () => {
			global.Date = mockDateFactory('2023-01-01T00:00:00.000Z');
			await collaborationState.addCollaborator(workflowId, 'userId');
			expect(mockCacheService.setHash).toHaveBeenCalledWith('collaboration:workflow', {
				userId: '2023-01-01T00:00:00.000Z',
			});
		});
	});
	describe('removeCollaborator', () => {
		it('should remove workflow user with correct cache key', async () => {
			await collaborationState.removeCollaborator(workflowId, 'userId');
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'userId',
			);
		});
	});
	describe('getCollaborators', () => {
		it('should get workflows with correct cache key', async () => {
			const users = await collaborationState.getCollaborators(workflowId);
			expect(mockCacheService.getHash).toHaveBeenCalledWith('collaboration:workflow');
			expect(users).toBeEmptyArray();
		});
		it('should get workflow users that are not expired', async () => {
			const nowMinus16Minutes = new Date();
			nowMinus16Minutes.setMinutes(nowMinus16Minutes.getMinutes() - 16);
			const now = new Date().toISOString();
			mockCacheService.getHash.mockResolvedValueOnce({
				expiredUserId: nowMinus16Minutes.toISOString(),
				notExpiredUserId: now,
			});
			const users = await collaborationState.getCollaborators(workflowId);
			expect(users).toEqual([
				{
					lastSeen: now,
					userId: 'notExpiredUserId',
				},
			]);
			expect(mockCacheService.deleteFromHash).toHaveBeenCalledWith(
				'collaboration:workflow',
				'expiredUserId',
			);
		});
	});
});
//# sourceMappingURL=collaboration.state.test.js.map
