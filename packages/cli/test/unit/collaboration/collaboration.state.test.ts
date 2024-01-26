import { TIME } from '@/constants';
import { CollaborationState } from '@/collaboration/collaboration.state';

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

	beforeEach(() => {
		collaborationState = new CollaborationState();
	});

	describe('cleanInactiveUsers', () => {
		const workflowId = 'workflow';

		it('should remove inactive users', () => {
			// Setup
			global.Date = mockDateFactory('2023-01-01T00:00:00.000Z');
			collaborationState.addActiveWorkflowUser(workflowId, 'inactiveUser');

			global.Date = mockDateFactory('2023-01-01T00:30:00.000Z');
			collaborationState.addActiveWorkflowUser(workflowId, 'activeUser');

			// Act: Clean inactive users
			jest
				.spyOn(global.Date, 'now')
				.mockReturnValue(new origDate('2023-01-01T00:35:00.000Z').getTime());
			collaborationState.cleanInactiveUsers(workflowId, 10 * TIME.MINUTE);

			// Assert: The inactive user should be removed
			expect(collaborationState.getActiveWorkflowUsers(workflowId)).toEqual([
				{ userId: 'activeUser', lastSeen: new origDate('2023-01-01T00:30:00.000Z') },
			]);
		});

		it('should not remove active users', () => {
			// Setup: Add an active user to the state
			global.Date = mockDateFactory('2023-01-01T00:30:00.000Z');
			collaborationState.addActiveWorkflowUser(workflowId, 'activeUser');

			// Act: Clean inactive users
			jest
				.spyOn(global.Date, 'now')
				.mockReturnValue(new origDate('2023-01-01T00:35:00.000Z').getTime());
			collaborationState.cleanInactiveUsers(workflowId, 10 * TIME.MINUTE);

			// Assert: The active user should still be present
			expect(collaborationState.getActiveWorkflowUsers(workflowId)).toEqual([
				{ userId: 'activeUser', lastSeen: new origDate('2023-01-01T00:30:00.000Z') },
			]);
		});
	});
});
