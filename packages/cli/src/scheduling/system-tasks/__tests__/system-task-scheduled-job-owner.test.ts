import { ScheduledJobOwnerType } from '@n8n/constants';

import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';

describe('SystemTaskScheduledJobOwner', () => {
	const owner = new SystemTaskScheduledJobOwner();

	it('claims the system-task owner type', () => {
		expect(owner.ownerType).toBe(ScheduledJobOwnerType.SystemTask);
	});

	it('owns a task by name, with no member', () => {
		expect(owner.owner('prune-executions')).toEqual({
			ownerType: 'system-task',
			ownerId: 'prune-executions',
			ownerMemberId: null,
		});
	});

	it('refuses to answer liveness, so the sweep leaves its jobs alone', async () => {
		await expect(owner.findExisting(['a', 'b'])).rejects.toThrow(
			'System task liveness needs a cross-version task inventory',
		);
	});
});
