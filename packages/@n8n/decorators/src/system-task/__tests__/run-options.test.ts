import { MAX_TIMER_DELAY_SECONDS, ScheduledJobMisfirePolicy } from '@n8n/constants';

import {
	resolveSystemTask,
	timeoutAfterLimit,
	type SystemTask,
	type SystemTaskRunOptions,
} from '../system-task';
import type { SchedulerOptions, SystemTaskTarget } from '../types';

const schedule = { kind: 'interval', intervalSeconds: 60 } as const;

const schedulerTask = (scheduler: SchedulerOptions): SystemTask => ({
	name: 'test-task',
	schedule,
	target: { scope: 'cluster', scheduler },
	run: async () => {},
});

const resolveSystemTaskRunOptions = (task: SystemTask) =>
	resolveSystemTask(task).runOptions as SystemTaskRunOptions;

const taskOn = (target: SystemTaskTarget, overrides: Partial<SystemTask> = {}): SystemTask => ({
	name: 'test-task',
	schedule,
	target,
	run: async () => {},
	...overrides,
});

it('should fill the defaults of the options a task does not state', () => {
	const options = resolveSystemTaskRunOptions(schedulerTask({ retryOnFailure: true }));

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
			retryOnFailure: false,
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
		schedulerTask({ retryOnFailure: true, concurrencyLimit: 'unlimited' }),
	);

	expect(options.concurrencyLimit).toBeNull();
});

it('should catch up when a task states it explicitly', () => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({ retryOnFailure: true, catchUp: true }),
	);

	expect(options.misfirePolicy).toBe(ScheduledJobMisfirePolicy.Coalesce);
});

it.each<[string, SchedulerOptions]>([
	['missedAfterSeconds', { retryOnFailure: true, missedAfterSeconds: 0 }],
	['missedAfterSeconds', { retryOnFailure: true, missedAfterSeconds: -1 }],
	['missedAfterSeconds', { retryOnFailure: true, missedAfterSeconds: 0.5 }],
	['missedAfterSeconds', { retryOnFailure: true, missedAfterSeconds: 86_400_000_000 }],
	['concurrencyLimit', { retryOnFailure: true, concurrencyLimit: 0 }],
	['concurrencyLimit', { retryOnFailure: true, concurrencyLimit: -1 }],
	['concurrencyLimit', { retryOnFailure: true, concurrencyLimit: 1.5 }],
	['concurrencyLimit', { retryOnFailure: true, concurrencyLimit: 2_147_483_648 }],
	['timeoutSeconds', { retryOnFailure: true, timeoutSeconds: -1 }],
	['timeoutSeconds', { retryOnFailure: true, timeoutSeconds: 2_147_484 }],
])('should reject an out-of-range %s in %o', (field, scheduler) => {
	expect(() => resolveSystemTaskRunOptions(schedulerTask(scheduler))).toThrow(
		expect.objectContaining({
			message: 'A system task declares an out-of-range option',
			extra: expect.objectContaining({ name: 'test-task', field }),
		}),
	);
});

it.each([
	[0, 1],
	[0.6, 1],
	[1.5, 2],
])('should round the timeout %s to %s like a schedule interval', (declared, stored) => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({ retryOnFailure: true, timeoutSeconds: declared }),
	);

	expect(options.timeoutSeconds).toBe(stored);
});

it('should accept the longest timeout a timer honors', () => {
	const options = resolveSystemTaskRunOptions(
		schedulerTask({ retryOnFailure: true, timeoutSeconds: 2_147_483 }),
	);

	expect(options.timeoutSeconds).toBe(2_147_483);
});

it.each<SystemTaskTarget>([
	{ scope: 'cluster', leaderTimer: {} },
	{ scope: 'instance', instanceTypes: ['main'] },
])(
	'should resolve no run options for a $scope task that does not run on the scheduler',
	(target) => {
		expect(resolveSystemTask(taskOn(target)).runOptions).toBeUndefined();
	},
);

it('should validate the scheduler options of a task', () => {
	expect(() =>
		resolveSystemTask(schedulerTask({ retryOnFailure: true, missedAfterSeconds: 0 })),
	).toThrow('A system task declares an out-of-range option');
});

it.each([0, -5, 2.5, NaN, Infinity, 2_147_484])(
	'should reject a retry delay of %s',
	(retryDelaySeconds) => {
		expect(() =>
			resolveSystemTask(taskOn({ scope: 'cluster', leaderTimer: { retryDelaySeconds } })),
		).toThrow(
			expect.objectContaining({
				message: 'A system task declares an out-of-range retry delay',
				extra: { name: 'test-task', retryDelaySeconds },
			}),
		);
	},
);

it('should accept the longest retry delay a timeout honors', () => {
	expect(() =>
		resolveSystemTask(taskOn({ scope: 'cluster', leaderTimer: { retryDelaySeconds: 2_147_483 } })),
	).not.toThrow();
});

it.each([0, -1, NaN, Infinity])(
	'should reject an instance task interval of %s seconds',
	(intervalSeconds) => {
		expect(() =>
			resolveSystemTask(
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
		resolveSystemTask(
			taskOn(
				{ scope: 'cluster', scheduler: { retryOnFailure: true } },
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
