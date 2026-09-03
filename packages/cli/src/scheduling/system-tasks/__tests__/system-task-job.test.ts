import { DEFAULT_MISFIRE_GRACE_SECONDS, ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { SystemTask, SystemTaskSchedule } from '@n8n/decorators';

import { systemTaskProvisionRequest } from '../system-task-job';
import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';

const NOW = new Date('2026-01-05T09:00:00.000Z');

const task = (over: Partial<SystemTask> = {}): SystemTask => ({
	name: 'prune-executions',
	schedule: { kind: 'interval', intervalSeconds: 60 },
	effects: 'idempotent',
	durable: true,
	run: async () => {},
	...over,
});

describe('systemTaskProvisionRequest', () => {
	const owner = new SystemTaskScheduledJobOwner();
	const request = (over: Partial<SystemTask> = {}, defaultTimezone = 'UTC') =>
		systemTaskProvisionRequest(task(over), owner, defaultTimezone, NOW);

	it('owns the job by task name, with no member', () => {
		expect(request().owner).toEqual({
			ownerType: 'system-task',
			ownerId: 'prune-executions',
			ownerMemberId: null,
		});
	});

	it('names the one job after the task and routes it to the task type of the same name', () => {
		const { taskType, desired } = request();

		expect(taskType).toBe('system:prune-executions');
		expect(desired).toHaveLength(1);
		expect(desired[0]?.name).toBe('system:prune-executions');
	});

	it('carries no payload, since the task type alone selects the handler', () => {
		expect(request().payload).toEqual({});
	});

	it('seeds an interval task one interval past now', () => {
		expect(request().desired[0]?.firstRunAt).toEqual(new Date('2026-01-05T09:01:00.000Z'));
	});

	it('seeds a task with no timezone of its own in the instance timezone', () => {
		// Now is already past 09:00 Berlin, so the first fire is the next day's, at
		// 08:00Z in January. A UTC fallback would seed it an hour later.
		const { desired } = request(
			{ schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: null } },
			'Europe/Berlin',
		);

		expect(desired[0]?.firstRunAt).toEqual(new Date('2026-01-06T08:00:00.000Z'));
	});

	it('stores the declared schedule, leaving an absent timezone absent', () => {
		const schedule: SystemTaskSchedule = {
			kind: 'cron',
			cronExpression: '0 0 9 * * *',
			timezone: null,
		};

		const { desired } = request({ schedule }, 'Europe/Berlin');

		expect(desired[0]?.schedule).toEqual(schedule);
	});

	it('coalesces and retries idempotent work', () => {
		expect(request({ effects: 'idempotent' })).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds: DEFAULT_MISFIRE_GRACE_SECONDS,
			maxAttempts: 3,
		});
	});

	it('skips and never retries non-idempotent work, even where the task asks for retries', () => {
		expect(request({ effects: 'non-idempotent', maxAttempts: 5 })).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			maxAttempts: 1,
		});
	});

	it("honours a task's own policy, grace and attempts", () => {
		expect(
			request({
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				misfireGraceSeconds: 300,
				maxAttempts: 7,
			}),
		).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			misfireGraceSeconds: 300,
			maxAttempts: 7,
		});
	});
});
