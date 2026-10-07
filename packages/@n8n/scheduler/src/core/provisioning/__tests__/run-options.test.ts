import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import { InvalidRunOptionError } from '../../errors';
import {
	findOutdatedJobs,
	resolveRunOptions,
	type RequestedRunOptions,
	type RunOptionDefaults,
	type RunOptions,
} from '../run-options';

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

const DEFAULTS: RunOptionDefaults = {
	maxAttempts: 5,
	timeoutSeconds: 300,
	misfireGraceSeconds: 90,
	executorIntervalSeconds: 5,
	materializationWindowSeconds: 60,
};

const resolve = (
	requested: Partial<RequestedRunOptions> = {},
	defaults: Partial<RunOptionDefaults> = {},
) =>
	resolveRunOptions(
		{ misfirePolicy: ScheduledJobMisfirePolicy.Coalesce, ...requested },
		{ ...DEFAULTS, ...defaults },
	);

const resolveGrace = (misfireGraceSeconds: unknown, defaults: Partial<RunOptionDefaults> = {}) =>
	resolve({ misfireGraceSeconds }, defaults);

describe('resolveRunOptions', () => {
	it('fills every omitted option from the instance defaults', () => {
		expect(resolve()).toEqual({
			runOptions: {
				maxAttempts: 5,
				timeoutSeconds: 300,
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 90,
				concurrencyLimit: null,
			},
		});
	});

	describe('misfire grace', () => {
		it('resolves a requested grace in place of the configured grace', () => {
			expect(resolveGrace(300).runOptions.misfireGraceSeconds).toBe(300);
		});

		it('raises a requested grace equal to the executor interval to one second above the interval', () => {
			const { runOptions } = resolveGrace(120, {
				executorIntervalSeconds: 120,
				materializationWindowSeconds: 60,
			});

			expect(runOptions.misfireGraceSeconds).toBe(121);
		});

		// A grace the node did not really supply falls back to the instance value, not
		// to a floor: below-one values (including `null`, which coerces to zero) and
		// values that are not a finite number at all.
		it.each([
			{ name: 'zero', grace: 0 },
			{ name: 'null', grace: null },
			{ name: 'a negative value', grace: -5 },
			{ name: 'a fraction below one', grace: 0.5 },
			{ name: 'NaN', grace: Number.NaN },
			{ name: 'undefined', grace: undefined },
			{ name: 'Infinity', grace: Number.POSITIVE_INFINITY },
			{ name: 'a non-numeric string', grace: 'not-a-number' },
		])('resolves $name to the instance-configured grace rather than to a floor', ({ grace }) => {
			expect(resolveGrace(grace)).toEqual({
				runOptions: expect.objectContaining({ misfireGraceSeconds: 90 }),
			});
		});

		it('truncates a fractional requested grace to whole seconds', () => {
			expect(resolveGrace(300.5).runOptions.misfireGraceSeconds).toBe(300);
		});

		it('leaves an instance-configured grace below the floors unclamped', () => {
			expect(resolveGrace(undefined, { misfireGraceSeconds: 10 }).runOptions).toEqual(
				expect.objectContaining({ misfireGraceSeconds: 10 }),
			);
		});

		it('resolves a requested grace given as a numeric string to that number', () => {
			expect(resolveGrace('300').runOptions.misfireGraceSeconds).toBe(300);
		});

		it('accepts a requested grace of one second, raising it to the floor', () => {
			expect(resolveGrace(1).runOptions.misfireGraceSeconds).toBe(60);
		});

		it('leaves a requested grace sitting exactly on the floor unadjusted', () => {
			expect(resolveGrace(60)).toEqual({
				runOptions: expect.objectContaining({ misfireGraceSeconds: 60 }),
			});
		});

		it('leaves a requested grace sitting exactly on the thirty-day cap unadjusted', () => {
			expect(resolveGrace(THIRTY_DAYS_IN_SECONDS)).toEqual({
				runOptions: expect.objectContaining({ misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS }),
			});
		});

		it('reports that it raised the grace, with the raw request', () => {
			const { runOptions, misfireGraceAdjustment } = resolveGrace(30.7);

			expect(runOptions.misfireGraceSeconds).toBe(60);
			expect(misfireGraceAdjustment).toEqual({
				direction: 'raised',
				requestedMisfireGraceSeconds: 30.7,
			});
		});

		it('lowers a requested grace above the thirty-day cap to the cap, reporting that it lowered it', () => {
			const { runOptions, misfireGraceAdjustment } = resolveGrace(THIRTY_DAYS_IN_SECONDS + 500);

			expect(runOptions.misfireGraceSeconds).toBe(THIRTY_DAYS_IN_SECONDS);
			expect(misfireGraceAdjustment).toEqual({
				direction: 'lowered',
				requestedMisfireGraceSeconds: THIRTY_DAYS_IN_SECONDS + 500,
			});
		});

		it('reports a fractional grace just above the thirty-day cap, whose truncation alone lands it on the cap', () => {
			const { runOptions, misfireGraceAdjustment } = resolveGrace(THIRTY_DAYS_IN_SECONDS + 0.5);

			expect(runOptions.misfireGraceSeconds).toBe(THIRTY_DAYS_IN_SECONDS);
			expect(misfireGraceAdjustment).toEqual({
				direction: 'lowered',
				requestedMisfireGraceSeconds: THIRTY_DAYS_IN_SECONDS + 0.5,
			});
		});

		it('raises a requested grace to the thirty-day cap when the configured floors exceed the cap', () => {
			const { runOptions, misfireGraceAdjustment } = resolveGrace(300, {
				materializationWindowSeconds: THIRTY_DAYS_IN_SECONDS + 1000,
			});

			expect(runOptions.misfireGraceSeconds).toBe(THIRTY_DAYS_IN_SECONDS);
			expect(misfireGraceAdjustment).toEqual({
				direction: 'raised',
				requestedMisfireGraceSeconds: 300,
			});
		});

		it.each([
			{
				name: 'the materialisation window',
				defaults: { materializationWindowSeconds: undefined as unknown as number },
			},
			{
				name: 'the executor interval',
				defaults: { executorIntervalSeconds: undefined as unknown as number },
			},
		])(
			'falls back to the instance-configured grace when $name is not configured',
			({ defaults }) => {
				expect(resolveGrace(300, defaults).runOptions.misfireGraceSeconds).toBe(90);
			},
		);
	});

	describe('attempts', () => {
		it('resolves a requested ceiling in place of the configured one', () => {
			expect(resolve({ maxAttempts: 1 }).runOptions.maxAttempts).toBe(1);
		});
	});

	describe('timeout', () => {
		it('resolves a requested timeout in place of the configured one', () => {
			expect(resolve({ timeoutSeconds: 45 }).runOptions.timeoutSeconds).toBe(45);
		});

		it.each([0, -1, 1.5, 2_147_484])('rejects a timeout of %s', (timeoutSeconds) => {
			expect(() => resolve({ timeoutSeconds })).toThrow(InvalidRunOptionError);
		});

		it('rejects a configured timeout outside the range', () => {
			expect(() => resolve({}, { timeoutSeconds: 0 })).toThrow(InvalidRunOptionError);
		});

		it('accepts the longest timeout a timer honors', () => {
			expect(resolve({ timeoutSeconds: 2_147_483 }).runOptions.timeoutSeconds).toBe(2_147_483);
		});
	});

	describe('concurrency limit', () => {
		it('resolves a requested limit', () => {
			expect(resolve({ concurrencyLimit: 2 }).runOptions.concurrencyLimit).toBe(2);
		});

		it.each([undefined, null])('resolves a limit of %s to no limit', (concurrencyLimit) => {
			expect(resolve({ concurrencyLimit }).runOptions.concurrencyLimit).toBeNull();
		});

		it('accepts the largest limit the column holds', () => {
			expect(resolve({ concurrencyLimit: 2_147_483_647 }).runOptions.concurrencyLimit).toBe(
				2_147_483_647,
			);
		});

		// 2_147_483_648 overflows the column on Postgres while SQLite would take it.
		it.each([0, -1, 1.5, Number.NaN, 2_147_483_648])(
			'rejects a limit of %s',
			(concurrencyLimit) => {
				expect(() => resolve({ concurrencyLimit })).toThrow(InvalidRunOptionError);
			},
		);
	});
});

describe('findOutdatedJobs', () => {
	const RUN_OPTIONS: RunOptions = {
		maxAttempts: 5,
		timeoutSeconds: 300,
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: 90,
		concurrencyLimit: null,
	};
	const PAYLOAD = { workflowId: 'wf' };

	const row = (over: Partial<RunOptions & { payload: Record<string, unknown> }> = {}) => ({
		id: 10,
		payload: { workflowId: 'wf' },
		...RUN_OPTIONS,
		...over,
	});

	const NONE = { runOptions: [], misfireGrace: [], timeout: [], payload: [] };

	it('lists no job whose run options and payload match', () => {
		expect(findOutdatedJobs([row()], RUN_OPTIONS, PAYLOAD)).toEqual(NONE);
	});

	it('lists a job whose grace changed for its run options and its queued deadlines', () => {
		expect(findOutdatedJobs([row({ misfireGraceSeconds: 60 })], RUN_OPTIONS, PAYLOAD)).toEqual({
			...NONE,
			runOptions: [10],
			misfireGrace: [10],
		});
	});

	it('lists a job whose timeout changed for its run options and its pending occurrences', () => {
		expect(findOutdatedJobs([row({ timeoutSeconds: 600 })], RUN_OPTIONS, PAYLOAD)).toEqual({
			...NONE,
			runOptions: [10],
			timeout: [10],
		});
	});

	it.each([
		{ name: 'policy', over: { misfirePolicy: ScheduledJobMisfirePolicy.Skip } },
		{ name: 'retry ceiling', over: { maxAttempts: 1 } },
		{ name: 'concurrency limit', over: { concurrencyLimit: 2 } },
	])('lists a job whose $name changed for its run options only', ({ over }) => {
		expect(findOutdatedJobs([row(over)], RUN_OPTIONS, PAYLOAD)).toEqual({
			...NONE,
			runOptions: [10],
		});
	});

	it('lists a job whose grace and policy both changed once in the run options', () => {
		const outdated = findOutdatedJobs(
			[row({ misfirePolicy: ScheduledJobMisfirePolicy.Skip, misfireGraceSeconds: 60 })],
			RUN_OPTIONS,
			PAYLOAD,
		);

		expect(outdated.runOptions).toEqual([10]);
	});

	it('lists a job whose stored payload differs by value', () => {
		expect(
			findOutdatedJobs([row({ payload: { workflowId: 'other' } })], RUN_OPTIONS, PAYLOAD),
		).toEqual({ ...NONE, payload: [10] });
	});
});
