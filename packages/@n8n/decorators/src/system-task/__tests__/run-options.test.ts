import { MAX_TIMER_DELAY_SECONDS, ScheduledJobMisfirePolicy } from '@n8n/constants';

import {
	resolveSystemTaskRunOptions,
	runsOnScheduler,
	timeoutAfterLimit,
	validateSystemTask,
	type SystemTask,
} from '../system-task';
import type { SchedulerOptions, SchedulerSystemTask, SystemTaskTarget } from '../types';

const schedule = { kind: 'interval', intervalSeconds: 60 } as const;

const schedulerTask = (scheduler: SchedulerOptions): SchedulerSystemTask => ({
	name: 'test-task',
	schedule,
	target: { scope: 'cluster', scheduler },
	run: async () => {},
});

const taskOn = (target: SystemTaskTarget, overrides: Partial<SystemTask> = {}): SystemTask => ({
	name: 'test-task',
	schedule,
	target,
	run: async () => {},
	...overrides,
});

it('should fill the defaults of the options a task does not state', () => {
	const options = resolveSystemTaskRunOptions(schedulerTask({ maxAttempts: 3 }));

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: 60,
		maxAttempts: 3,
		concurrencyLimit: 1,
		timeoutSeconds: undefined,
	});
});

it('should map the options a task states to what the scheduler stores', () => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({
			maxAttempts: 1,
			missedAfterSeconds: 300,
			catchUp: false,
			concurrencyLimit: 4,
			timeoutSeconds: 600,
		}),
	);

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 300,
		maxAttempts: 1,
		concurrencyLimit: 4,
		timeoutSeconds: 600,
	});
});

it('should store an unlimited concurrency as no limit', () => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({ maxAttempts: 3, concurrencyLimit: 'unlimited' }),
	);

	expect(options.concurrencyLimit).toBeNull();
});

it('should catch up when a task states it explicitly', () => {
	const options = resolveSystemTaskRunOptions(schedulerTask({ maxAttempts: 3, catchUp: true }));

	expect(options.misfirePolicy).toBe(ScheduledJobMisfirePolicy.Coalesce);
});

it.each<[string, SchedulerOptions]>([
	['maxAttempts', { maxAttempts: 0 }],
	['maxAttempts', { maxAttempts: -1 }],
	['maxAttempts', { maxAttempts: 1.5 }],
	['maxAttempts', { maxAttempts: 2_147_483_648 }],
	['missedAfterSeconds', { maxAttempts: 3, missedAfterSeconds: 0 }],
	['missedAfterSeconds', { maxAttempts: 3, missedAfterSeconds: -1 }],
	['missedAfterSeconds', { maxAttempts: 3, missedAfterSeconds: 0.5 }],
	['missedAfterSeconds', { maxAttempts: 3, missedAfterSeconds: 86_400_000_000 }],
	['concurrencyLimit', { maxAttempts: 3, concurrencyLimit: 0 }],
	['concurrencyLimit', { maxAttempts: 3, concurrencyLimit: -1 }],
	['concurrencyLimit', { maxAttempts: 3, concurrencyLimit: 1.5 }],
	['concurrencyLimit', { maxAttempts: 3, concurrencyLimit: 2_147_483_648 }],
	['timeoutSeconds', { maxAttempts: 3, timeoutSeconds: 0 }],
	['timeoutSeconds', { maxAttempts: 3, timeoutSeconds: -1 }],
	['timeoutSeconds', { maxAttempts: 3, timeoutSeconds: 1.5 }],
	['timeoutSeconds', { maxAttempts: 3, timeoutSeconds: 2_147_484 }],
])('should reject an out-of-range %s in %o', (field, scheduler) => {
	expect(() => resolveSystemTaskRunOptions(schedulerTask(scheduler))).toThrow(
		expect.objectContaining({
			message: 'A system task declares an out-of-range option',
			extra: expect.objectContaining({ name: 'test-task', field }),
		}),
	);
});

it('should accept the longest timeout a timer honors', () => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({ maxAttempts: 3, timeoutSeconds: 2_147_483 }),
	);

	expect(options.timeoutSeconds).toBe(2_147_483);
});

it('should resolve no run options for a task that does not run on the scheduler', () => {
	expect(
		resolveSystemTaskRunOptions(taskOn({ scope: 'cluster', leaderTimer: {} })),
	).toBeUndefined();
});

it('should tell a scheduler task from a leader timer task and an instance task', () => {
	expect(runsOnScheduler(schedulerTask({ maxAttempts: 3 }))).toBe(true);
	expect(runsOnScheduler(taskOn({ scope: 'cluster', leaderTimer: {} }))).toBe(false);
	expect(runsOnScheduler(taskOn({ scope: 'instance', instanceTypes: ['main'] }))).toBe(false);
});

it('should validate the scheduler options of a task', () => {
	expect(() => validateSystemTask(schedulerTask({ maxAttempts: 0 }))).toThrow(
		'A system task declares an out-of-range option',
	);
});

it.each([0, -5, 2.5, NaN, Infinity, 2_147_484])(
	'should reject a retry delay of %s',
	(retryDelaySeconds) => {
		expect(() =>
			validateSystemTask(taskOn({ scope: 'cluster', leaderTimer: { retryDelaySeconds } })),
		).toThrow(
			expect.objectContaining({
				message: 'A system task declares an out-of-range retry delay',
				extra: { name: 'test-task', retryDelaySeconds },
			}),
		);
	},
);

it('should reject an out-of-range retry delay of an instance task', () => {
	expect(() =>
		validateSystemTask(
			taskOn({ scope: 'instance', instanceTypes: ['main'], retryDelaySeconds: 0 }),
		),
	).toThrow('A system task declares an out-of-range retry delay');
});

it('should accept the longest retry delay a timeout honors', () => {
	expect(() =>
		validateSystemTask(taskOn({ scope: 'cluster', leaderTimer: { retryDelaySeconds: 2_147_483 } })),
	).not.toThrow();
});

it.each([0, -1, NaN, Infinity])(
	'should reject an instance task interval of %s seconds',
	(intervalSeconds) => {
		expect(() =>
			validateSystemTask(
				taskOn(
					{ scope: 'instance', instanceTypes: ['main'] },
					{ schedule: { kind: 'interval', intervalSeconds } },
				),
			),
		).toThrow(
			expect.objectContaining({
				message: 'A system task declares an interval that is not positive and finite',
				extra: { name: 'test-task', intervalSeconds },
			}),
		);
	},
);

it('should accept a cluster task interval of 0 seconds, which is rounded up', () => {
	expect(() =>
		validateSystemTask(
			taskOn(
				{ scope: 'cluster', scheduler: { maxAttempts: 3 } },
				{ schedule: { kind: 'interval', intervalSeconds: 0 } },
			),
		),
	).not.toThrow();
});

describe('timeoutAfterLimit', () => {
	it.each([
		{ limit: 300, margin: 300, expected: 600 },
		{ limit: 1.2, margin: 0, expected: 2 },
		{ limit: MAX_TIMER_DELAY_SECONDS, margin: 300, expected: MAX_TIMER_DELAY_SECONDS },
	])('adds the margin to a limit of $limit', ({ limit, margin, expected }) => {
		expect(timeoutAfterLimit(limit, margin)).toBe(expected);
	});

	it.each([0, -1, Number.NaN])('uses the longest timeout for no limit (%s)', (limit) => {
		expect(timeoutAfterLimit(limit, 300)).toBe(MAX_TIMER_DELAY_SECONDS);
	});
});
