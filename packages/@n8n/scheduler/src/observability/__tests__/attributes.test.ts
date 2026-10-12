import type { RecordedOccurrence } from '../../core/materializer';
import type { ClaimedTask } from '../../core/types';
import {
	SCHEDULER_ATTRIBUTES,
	pickSchedulerTaskAttributes,
	pickSchedulerTaskIdentity,
} from '../attributes';

const occurrence: RecordedOccurrence = {
	id: '1',
	jobId: 10,
	taskType: 'workflow:schedule-trigger',
};

const claimedTask: ClaimedTask = {
	...occurrence,
	payload: {},
	scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
	runAt: new Date('2026-07-01T00:01:00.000Z'),
	status: 'running',
	attempts: 1,
	maxAttempts: 3,
	leaseEpoch: 2,
};

describe('pickSchedulerTaskIdentity', () => {
	it('picks the task id, job id and task type', () => {
		expect(pickSchedulerTaskIdentity(occurrence)).toEqual({
			[SCHEDULER_ATTRIBUTES.taskId]: '1',
			[SCHEDULER_ATTRIBUTES.jobId]: 10,
			[SCHEDULER_ATTRIBUTES.taskType]: 'workflow:schedule-trigger',
		});
	});
});

describe('pickSchedulerTaskAttributes', () => {
	it('picks the identity plus the lease, attempt counts and instants', () => {
		expect(pickSchedulerTaskAttributes(claimedTask)).toEqual({
			...pickSchedulerTaskIdentity(claimedTask),
			[SCHEDULER_ATTRIBUTES.leaseEpoch]: 2,
			[SCHEDULER_ATTRIBUTES.attempts]: 1,
			[SCHEDULER_ATTRIBUTES.maxAttempts]: 3,
			[SCHEDULER_ATTRIBUTES.scheduledFor]: '2026-07-01T00:00:00.000Z',
			[SCHEDULER_ATTRIBUTES.runAt]: '2026-07-01T00:01:00.000Z',
		});
	});
});
