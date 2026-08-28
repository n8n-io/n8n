import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import {
	resolveSystemTaskRunOptions,
	type SystemTask,
	type SystemTaskEffects,
	type SystemTaskSchedule,
} from '../system-task';

const schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 60 };

const taskWith = (overrides: Partial<SystemTask> & { effects: SystemTaskEffects }): SystemTask => ({
	name: 'test-task',
	schedule,
	durable: false,
	run: async () => {},
	...overrides,
});

it('should let an idempotent task retry and run late', () => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent' }));

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: 60,
		maxAttempts: 3,
	});
});

it('should keep a non-idempotent task to a single attempt and drop missed occurrences', () => {
	const options = resolveSystemTaskRunOptions(taskWith({ effects: 'non-idempotent' }));

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 60,
		maxAttempts: 1,
	});
});

it.each([
	['misfirePolicy', { misfirePolicy: ScheduledJobMisfirePolicy.Skip }],
	['misfireGraceSeconds', { misfireGraceSeconds: 5 }],
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
])('should reject the nonsensical override %o', (override) => {
	expect(() =>
		resolveSystemTaskRunOptions(taskWith({ effects: 'idempotent', ...override })),
	).toThrowError('test-task');
});

it('should keep the defaults for the fields a task does not override', () => {
	const options = resolveSystemTaskRunOptions(
		taskWith({ effects: 'non-idempotent', maxAttempts: 10 }),
	);

	expect(options).toEqual({
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 60,
		maxAttempts: 10,
	});
});
