import {
	resolveSystemTaskSchedule,
	type SystemTask,
	type SystemTaskSchedule,
} from '../system-task';

const taskWith = (schedule: SystemTaskSchedule): SystemTask => ({
	name: 'test-task',
	schedule,
	effects: 'idempotent',
	durable: false,
	run: async () => {},
});

it.each([
	[3600, 3600],
	[245.99999999999997, 246],
	[1980.0000000000002, 1980],
	[90.4, 90],
	[0.2, 1],
])('should round an interval of %s seconds to %s', (declared, expected) => {
	const schedule = resolveSystemTaskSchedule(
		taskWith({ kind: 'interval', intervalSeconds: declared }),
	);

	expect(schedule).toEqual({ kind: 'interval', intervalSeconds: expected });
});

it('should return a cron schedule unchanged', () => {
	const cron: SystemTaskSchedule = { kind: 'cron', cronExpression: '0 3 * * *', timezone: 'UTC' };

	expect(resolveSystemTaskSchedule(taskWith(cron))).toBe(cron);
});
