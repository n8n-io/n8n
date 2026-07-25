import { CorruptStorageRowError } from '../../errors';
import type { ScheduledJob } from '../../types';
import { resolveSchedule } from '../resolve';

const DEFAULT_TZ = 'America/New_York';

/** Build a flat job row with sensible defaults, overridable per test. */
function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
	return {
		id: 1,
		taskType: 'scheduleTrigger',
		payload: {},
		kind: 'interval',
		cronExpression: null,
		timezone: null,
		intervalSeconds: 60,
		fireAt: null,
		recurrenceUnit: null,
		recurrenceSize: null,
		nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
		lastFiredAt: null,
		maxAttempts: 1,
		...overrides,
	};
}

describe('resolveSchedule', () => {
	it('assembles a cron schedule from the flat columns', () => {
		const schedule = resolveSchedule(
			makeJob({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
				intervalSeconds: null,
			}),
			DEFAULT_TZ,
		);

		expect(schedule).toEqual({
			kind: 'cron',
			cronExpression: '0 0 9 * * *',
			timezone: 'Europe/Berlin',
		});
	});

	it('resolves a null cron timezone to the default timezone', () => {
		const schedule = resolveSchedule(
			makeJob({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: null,
				intervalSeconds: null,
			}),
			DEFAULT_TZ,
		);

		expect(schedule).toEqual({
			kind: 'cron',
			cronExpression: '0 0 9 * * *',
			timezone: DEFAULT_TZ,
		});
	});

	it('assembles a recurring_cron schedule from the flat columns', () => {
		const schedule = resolveSchedule(
			makeJob({
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
				intervalSeconds: null,
			}),
			DEFAULT_TZ,
		);

		expect(schedule).toEqual({
			kind: 'recurring_cron',
			cronExpression: '0 0 9 * * 1',
			timezone: 'UTC',
			recurrenceUnit: 'weeks',
			recurrenceSize: 3,
		});
	});

	it('resolves a null recurring_cron timezone to the instance default', () => {
		const schedule = resolveSchedule(
			makeJob({
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: null,
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
				intervalSeconds: null,
			}),
			DEFAULT_TZ,
		);

		expect(schedule).toMatchObject({ timezone: DEFAULT_TZ });
	});

	it('throws when a recurring_cron row is missing a required column', () => {
		const row = {
			kind: 'recurring_cron',
			cronExpression: '0 0 9 * * 1',
			recurrenceUnit: 'weeks',
			recurrenceSize: 3,
			intervalSeconds: null,
		} as const;
		expect(() => resolveSchedule(makeJob({ ...row, cronExpression: null }), DEFAULT_TZ)).toThrow(
			CorruptStorageRowError,
		);
		expect(() => resolveSchedule(makeJob({ ...row, recurrenceUnit: null }), DEFAULT_TZ)).toThrow(
			CorruptStorageRowError,
		);
		expect(() => resolveSchedule(makeJob({ ...row, recurrenceSize: null }), DEFAULT_TZ)).toThrow(
			CorruptStorageRowError,
		);
	});

	it('assembles an interval schedule', () => {
		const schedule = resolveSchedule(
			makeJob({ kind: 'interval', intervalSeconds: 30 }),
			DEFAULT_TZ,
		);

		expect(schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
	});

	it('assembles a one_off schedule', () => {
		const fireAt = new Date('2026-06-01T12:00:00.000Z');
		const schedule = resolveSchedule(
			makeJob({ kind: 'one_off', intervalSeconds: null, fireAt }),
			DEFAULT_TZ,
		);

		expect(schedule).toEqual({ kind: 'one_off', fireAt });
	});

	it('throws when a column required by the kind is missing', () => {
		expect(() =>
			resolveSchedule(makeJob({ kind: 'interval', intervalSeconds: null }), DEFAULT_TZ),
		).toThrow(CorruptStorageRowError);
		expect(() =>
			resolveSchedule(makeJob({ kind: 'cron', intervalSeconds: null }), DEFAULT_TZ),
		).toThrow(CorruptStorageRowError);
		expect(() =>
			resolveSchedule(makeJob({ kind: 'one_off', intervalSeconds: null }), DEFAULT_TZ),
		).toThrow(CorruptStorageRowError);
	});

	it('throws on a kind outside the enum (a corrupt row)', () => {
		const corrupt = makeJob({ kind: 'weekly' as ScheduledJob['kind'] });
		expect(() => resolveSchedule(corrupt, DEFAULT_TZ)).toThrow(CorruptStorageRowError);
	});
});
