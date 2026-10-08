import {
	intervalFromMilliseconds,
	intervalFromSeconds,
	resolveSystemTaskSchedule,
	type SystemTask,
} from '../system-task';
import type { SystemTaskTarget, SystemTaskSchedule } from '../types';

const taskWith = (
	schedule: SystemTaskSchedule,
	target: SystemTaskTarget = { scope: 'cluster', leaderTimer: {} },
): SystemTask => ({
	name: 'test-task',
	schedule,
	target,
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

it('should round a sub-second interval of a scheduler task to one second', () => {
	const schedule = resolveSystemTaskSchedule(
		taskWith(
			{ kind: 'interval', intervalSeconds: 0.5 },
			{ scope: 'cluster', scheduler: { maxAttempts: 3 } },
		),
	);

	expect(schedule).toEqual({ kind: 'interval', intervalSeconds: 1 });
});

it('should return a cron schedule unchanged', () => {
	const cron: SystemTaskSchedule = { kind: 'cron', cronExpression: '0 3 * * *', timezone: 'UTC' };

	expect(resolveSystemTaskSchedule(taskWith(cron))).toBe(cron);
});

it.each([
	[90, 90],
	[90.45, 90],
	[130.5, 131],
	[0, 0],
])('should build an interval schedule of %s seconds as %s seconds', (declared, seconds) => {
	expect(intervalFromSeconds(declared)).toEqual({ kind: 'interval', intervalSeconds: seconds });
});

it.each([-1, Number.NaN])('should reject an interval of %s seconds', (seconds) => {
	expect(() => intervalFromSeconds(seconds)).toThrow(
		'A system task interval in seconds is negative or not a number',
	);
});

it.each([
	[500, 0.5],
	[1000, 1],
	[300_000, 300],
	[245_999.99999999997, 246],
	[500.4, 0.5],
])(
	'should build an interval schedule of %s milliseconds as %s seconds',
	(milliseconds, seconds) => {
		expect(intervalFromMilliseconds(milliseconds)).toEqual({
			kind: 'interval',
			intervalSeconds: seconds,
		});
	},
);
