import {
	resolveSystemTaskSchedule,
	type SystemTask,
	type SystemTaskSchedule,
} from '../system-task';
import type { SystemTaskPlacement } from '../system-task-placement';

const taskWith = (
	schedule: SystemTaskSchedule,
	placement: SystemTaskPlacement = { scope: 'cluster', durable: false },
): SystemTask => ({
	name: 'test-task',
	schedule,
	effects: 'idempotent',
	placement,
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

it.each([
	[0.5, 0.5],
	[0.0004, 0.001],
	[0.12345, 0.123],
	[90.4, 90.4],
])('should keep an instance task interval of %s seconds as %s', (declared, expected) => {
	const schedule = resolveSystemTaskSchedule(
		taskWith(
			{ kind: 'interval', intervalSeconds: declared },
			{ scope: 'instance', instanceTypes: ['main'] },
		),
	);

	expect(schedule).toEqual({ kind: 'interval', intervalSeconds: expected });
});

it('should round a sub-second interval of a durable task to one second', () => {
	const schedule = resolveSystemTaskSchedule(
		taskWith({ kind: 'interval', intervalSeconds: 0.5 }, { scope: 'cluster', durable: true }),
	);

	expect(schedule).toEqual({ kind: 'interval', intervalSeconds: 1 });
});

it('should return a cron schedule unchanged', () => {
	const cron: SystemTaskSchedule = { kind: 'cron', cronExpression: '0 3 * * *', timezone: 'UTC' };

	expect(resolveSystemTaskSchedule(taskWith(cron))).toBe(cron);
});
