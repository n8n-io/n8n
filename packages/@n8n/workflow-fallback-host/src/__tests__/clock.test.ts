/**
 * The run clock of a step (`CLOCK-OFFSET`, spec 9). A step whose frame has
 * `execution.clockOffsetMs` reads `now + offset`; without it, the real clock.
 */
import { spawnSync } from 'node:child_process';

import { runCodeStep, runWithClockOffset } from '../code-step';
import { disposeExpressionEngine, NodeStepRunner, parseNodeStepArgs } from '../node-step';
import { readClockOffset, type JsonObject } from '../protocol';
import { runPythonStep } from '../python-step';

const DAY = 86_400_000;
const OFFSET = -DAY;

/** The tolerance of a comparison with the clock of the test process. */
const SLACK_MS = 5_000;

const hasPython = spawnSync('python3', ['--version']).status === 0;

function numberField(item: JsonObject | undefined, key: string): number {
	const value = item?.[key];
	if (typeof value !== 'number') throw new Error(`"${key}" is not a number`);
	return value;
}

/** Runs a code step with the clock of a step frame that has `offsetMs`. */
function runCodeAt(offsetMs: number, code: string): JsonObject[] {
	return runWithClockOffset(offsetMs, () => runCodeStep({ name: 'clock', code, items: [] }));
}

const CODE = `return [{
	dateNow: Date.now(),
	constructed: new Date().getTime(),
	called: Date.parse(Date()),
	luxonNow: DateTime.now().toMillis(),
	dollarNow: $now.toMillis(),
	dollarToday: $today.toMillis(),
	todayAtMidnight: $today.toFormat('HH:mm:ss'),
	epoch: new Date(0).getTime(),
	fromValue: new Date(86400000).toISOString(),
	parsed: Date.parse('1970-01-01T00:00:00.000Z'),
	utc: Date.UTC(1970, 0, 1),
	isDate: new Date() instanceof Date,
	prototype: new Date(0) instanceof Date,
}];`;

describe('the run clock of a code step', () => {
	it('gives Date, Date.now and Luxon the shifted time', () => {
		const real = Date.now();
		const item = runCodeAt(OFFSET, CODE)[0];
		const shifted = real + OFFSET;

		expect(Math.abs(numberField(item, 'dateNow') - shifted)).toBeLessThan(SLACK_MS);
		expect(Math.abs(numberField(item, 'constructed') - shifted)).toBeLessThan(SLACK_MS);
		expect(Math.abs(numberField(item, 'called') - shifted)).toBeLessThan(SLACK_MS);
		expect(Math.abs(numberField(item, 'luxonNow') - shifted)).toBeLessThan(SLACK_MS);
		expect(Math.abs(numberField(item, 'dollarNow') - shifted)).toBeLessThan(SLACK_MS);
		expect(numberField(item, 'dollarToday')).toBeLessThanOrEqual(numberField(item, 'dollarNow'));
		expect(numberField(item, 'dollarToday')).toBeGreaterThan(
			numberField(item, 'dollarNow') - 2 * DAY,
		);
		expect(item?.todayAtMidnight).toBe('00:00:00');

		// A date with arguments, and the static methods, do not move.
		expect(numberField(item, 'epoch')).toBe(0);
		expect(item?.fromValue).toBe('1970-01-02T00:00:00.000Z');
		expect(numberField(item, 'parsed')).toBe(0);
		expect(numberField(item, 'utc')).toBe(0);

		// The context's own Date stays a Date, and its prototype methods work.
		expect(item?.isDate).toBe(true);
		expect(item?.prototype).toBe(true);
	});

	it('gives the real time without an offset', () => {
		const before = Date.now();
		const item = runCodeAt(0, CODE)[0];
		const after = Date.now();

		for (const key of ['dateNow', 'constructed', 'luxonNow', 'dollarNow']) {
			expect(numberField(item, key)).toBeGreaterThanOrEqual(before);
			expect(numberField(item, key)).toBeLessThanOrEqual(after);
		}
		// Date() gives a string without milliseconds, so a second can be missing.
		expect(Math.abs(numberField(item, 'called') - before)).toBeLessThan(1_000);
	});
});

describe('the run clock of a Python code step', () => {
	it.skipIf(!hasPython)('gives datetime and time the shifted time', () => {
		process.env.WF_FALLBACK_PYTHON_STDLIB_ALLOW = 'datetime,time';
		try {
			const before = Date.now();
			const out = runWithClockOffset(OFFSET, () =>
				runPythonStep(
					{
						name: 'clock',
						code: [
							'import datetime, time',
							'return [{"now": datetime.datetime.now().timestamp() * 1000,',
							'         "epoch": time.time() * 1000,',
							'         "today": datetime.date.today().isoformat()}]',
						].join('\n'),
						items: [],
					},
					{ timeoutMs: 20_000 },
				),
			);
			expect(Math.abs(numberField(out[0], 'now') - (before + OFFSET))).toBeLessThan(SLACK_MS);
			expect(Math.abs(numberField(out[0], 'epoch') - (before + OFFSET))).toBeLessThan(SLACK_MS);
			expect(out[0]?.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		} finally {
			delete process.env.WF_FALLBACK_PYTHON_STDLIB_ALLOW;
		}
	});
});

describe('the run clock of an expression', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	/** Runs a Set step whose field is one expression, with the clock of a step frame. */
	async function evaluate(expression: string, key: string, offsetMs: number): Promise<unknown> {
		const run = async () =>
			await runner.run(
				parseNodeStepArgs({
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					parameters: {
						assignments: {
							assignments: [
								{ id: 'a', name: 'out', value: `={{ ${expression} }}`, type: 'string' },
							],
						},
						options: { ignoreConversionErrors: true },
					},
					items: [{}],
				}),
				{ step: 'Set', key },
			);
		const result = await runWithClockOffset(offsetMs, run);
		return result[0]?.out;
	}

	afterAll(async () => {
		await disposeExpressionEngine();
	});

	it('gives $now, $today, Date.now and new Date the shifted time', async () => {
		const real = Date.now();
		const shifted = real + OFFSET;

		// $now.toMillis() stays in the native subset; $now.valueOf() runs in the isolate.
		const now = Number(await evaluate('$now.toMillis()', 'e1', OFFSET));
		const isolateNow = Number(await evaluate('$now.valueOf()', 'e2', OFFSET));
		const dateNow = Number(await evaluate('Date.now()', 'e3', OFFSET));
		const constructed = Number(await evaluate('new Date().getTime()', 'e4', OFFSET));
		const today = Number(await evaluate('$today.toMillis()', 'e5', OFFSET));

		for (const value of [now, isolateNow, dateNow, constructed]) {
			expect(Math.abs(value - shifted)).toBeLessThan(SLACK_MS);
		}
		expect(today).toBeLessThanOrEqual(now);
		expect(today).toBeGreaterThan(now - 2 * DAY);
	});

	it('gives the real time again after the step', async () => {
		const before = Date.now();
		const values = [
			Number(await evaluate('$now.toMillis()', 'r1', 0)),
			Number(await evaluate('Date.now()', 'r2', 0)),
		];
		const after = Date.now();

		for (const value of values) {
			expect(value).toBeGreaterThanOrEqual(before);
			expect(value).toBeLessThanOrEqual(after);
		}
	});
});

describe('the run clock of a node step', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	/** Runs the "current date" operation of the Date & Time node with `offsetMs`. */
	async function currentDate(offsetMs: number, key: string): Promise<string> {
		const run = async () =>
			await runner.run(
				parseNodeStepArgs({
					name: 'Date & Time',
					type: 'n8n-nodes-base.dateTime',
					typeVersion: 2,
					parameters: {
						operation: 'getCurrentDate',
						includeTime: true,
						outputFieldName: 'now',
						options: { timezone: 'UTC' },
					},
					items: [{}],
				}),
				{ step: 'Date & Time', key },
			);
		const result = await runWithClockOffset(offsetMs, run);
		const value = result[0]?.now;
		if (typeof value !== 'string') throw new Error('The node gave no date');
		return value;
	}

	afterAll(async () => {
		await disposeExpressionEngine();
	});

	it('gives a node that reads Luxon the shifted time', async () => {
		const real = Date.now();
		const shifted = Date.parse(await currentDate(OFFSET, 'n1'));

		expect(Math.abs(shifted - (real + OFFSET))).toBeLessThan(SLACK_MS);
		// The step ends, so the next step reads the real clock again.
		const after = Date.parse(await currentDate(0, 'n2'));
		expect(Math.abs(after - Date.now())).toBeLessThan(SLACK_MS);
	});
});

describe('the clock offset of a step frame', () => {
	it('reads execution.clockOffsetMs', () => {
		expect(readClockOffset({ id: 'e', clockOffsetMs: OFFSET })).toBe(OFFSET);
		expect(readClockOffset({ id: 'e', clockOffsetMs: 1 })).toBe(1);
	});

	it('is 0 without an offset or with a value that is not an integer', () => {
		expect(readClockOffset(undefined)).toBe(0);
		expect(readClockOffset({ id: 'e' })).toBe(0);
		expect(readClockOffset({ id: 'e', clockOffsetMs: 0 })).toBe(0);
		expect(readClockOffset({ id: 'e', clockOffsetMs: 'x' })).toBe(0);
		expect(readClockOffset({ id: 'e', clockOffsetMs: 1.5 })).toBe(0);
	});
});
