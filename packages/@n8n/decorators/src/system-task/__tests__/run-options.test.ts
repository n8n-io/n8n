import { MAX_TASK_TIMEOUT_SECONDS, ScheduledJobMisfirePolicy } from '@n8n/constants';

import {
	resolveSystemTaskRunOptions,
	timeoutAfterLimit,
	validateSystemTask,
	type SystemTask,
	type SystemTaskEffects,
	type SystemTaskSchedule,
} from '../system-task';

const schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 60 };

const taskWith = (overrides: Partial<SystemTask> & { effects: SystemTaskEffects }): SystemTask => ({
	name: 'test-task',
	schedule,
	placement: { scope: 'cluster', durable: false },
	run: async () => {},
	...overrides,
});

it('should let an idempotent task retry and run late', () => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent' }));

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: 60,
		maxAttempts: 3,
		concurrencyLimit: 1,
	});
});

it('should keep a non-idempotent task to a single attempt and drop missed occurrences', () => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'non-idempotent' }));

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 60,
		maxAttempts: 1,
		concurrencyLimit: 1,
	});
});

it.each([
	['misfirePolicy', { misfirePolicy: ScheduledJobMisfirePolicy.Skip }],
	['misfireGraceSeconds', { misfireGraceSeconds: 5 }],
	['concurrencyLimit', { concurrencyLimit: 4 }],
	['timeoutSeconds', { timeoutSeconds: 600 }],
] as const)('should let a task override %s', (field, override) => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent', ...override }));

	expect(options[field]).toBe(override[field as keyof typeof override]);
});

it.each([
	{ maxAttempts: 0 },
	{ maxAttempts: -1 },
	{ maxAttempts: 1.5 },
	{ maxAttempts: 2_147_483_648 },
	{ misfireGraceSeconds: 0 },
	{ misfireGraceSeconds: -1 },
	{ misfireGraceSeconds: 0.5 },
	{ misfireGraceSeconds: 86_400_000_000 },
	{ concurrencyLimit: 0 },
	{ concurrencyLimit: -1 },
	{ concurrencyLimit: 1.5 },
	{ concurrencyLimit: 2_147_483_648 },
	{ timeoutSeconds: 0 },
	{ timeoutSeconds: -1 },
	{ timeoutSeconds: 1.5 },
	{ timeoutSeconds: 2_147_484 },
])('should reject the nonsensical override %o', (override) => {
	expect(() =>
		resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent', ...override })),
	).toThrow(
		expect.objectContaining({
			message: 'A system task declares an out-of-range option',
			extra: expect.objectContaining({ name: 'test-task', field: Object.keys(override)[0] }),
		}),
	);
});

it('should keep the defaults for the fields a task does not override', () => {
	const options = resolveSystemTaskRunOptions(
		taskWith({ effects: 'non-idempotent', misfireGraceSeconds: 5 }),
	);

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 5,
		maxAttempts: 1,
		concurrencyLimit: 1,
	});
});

it('should refuse to retry non-idempotent work that asked for more attempts', () => {
	const options = resolveSystemTaskRunOptions(
		taskWith({ effects: 'non-idempotent', maxAttempts: 10 }),
	);

	expect(options.maxAttempts).toBe(1);
});

it('should leave the timeout to the scheduler when a task does not override it', () => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent' }));

	expect(options.timeoutSeconds).toBeUndefined();
});

it('should accept the longest timeout a timer honors', () => {
	const options = resolveSystemTaskRunOptions(
		taskWith({ effects: 'idempotent', timeoutSeconds: 2_147_483 }),
	);

	expect(options.timeoutSeconds).toBe(2_147_483);
});

it('should let a task permit overlap', () => {
	const options = resolveSystemTaskRunOptions(
		taskWith({ effects: 'idempotent', concurrencyLimit: null }),
	);

	expect(options.concurrencyLimit).toBeNull();
});

it.each([0, -5, 2.5, NaN, Infinity, 2_147_484])(
	'should reject a retry delay of %s',
	(retryDelaySeconds) => {
		expect(() =>
			validateSystemTask(taskWith({ effects: 'idempotent', retryDelaySeconds })),
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
		validateSystemTask(taskWith({ effects: 'idempotent', retryDelaySeconds: 2_147_483 })),
	).not.toThrow();
});

it.each([0, -1, NaN, Infinity])(
	'should reject an instance task interval of %s seconds',
	(intervalSeconds) => {
		expect(() =>
			validateSystemTask(
				taskWith({
					effects: 'idempotent',
					schedule: { kind: 'interval', intervalSeconds },
					placement: { scope: 'instance', instanceTypes: ['main'] },
				}),
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
			taskWith({ effects: 'idempotent', schedule: { kind: 'interval', intervalSeconds: 0 } }),
		),
	).not.toThrow();
});

describe('timeoutAfterLimit', () => {
	it.each([
		{ limit: 300, margin: 300, expected: 600 },
		{ limit: 1.2, margin: 0, expected: 2 },
		{ limit: MAX_TASK_TIMEOUT_SECONDS, margin: 300, expected: MAX_TASK_TIMEOUT_SECONDS },
	])('adds the margin to a limit of $limit', ({ limit, margin, expected }) => {
		expect(timeoutAfterLimit(limit, margin)).toBe(expected);
	});

	it.each([0, -1, Number.NaN])('uses the longest timeout for no limit (%s)', (limit) => {
		expect(timeoutAfterLimit(limit, 300)).toBe(MAX_TASK_TIMEOUT_SECONDS);
	});
});
