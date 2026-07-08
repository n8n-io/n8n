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
});
