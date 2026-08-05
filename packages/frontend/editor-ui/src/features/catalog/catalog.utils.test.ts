import type { CatalogSubscription, ScheduleDraft } from '@/features/catalog/catalog.types';
import {
	cronToDraft,
	DEFAULT_SCHEDULE_DRAFT,
	draftToCron,
	summariseOwnSchedules,
} from '@/features/catalog/catalog.utils';

describe('draftToCron', () => {
	it.each([
		['hourly', { frequency: 'hourly', minute: 30, hour: 9, weekday: 1 }, '0 30 * * * *'],
		['daily', { frequency: 'daily', minute: 0, hour: 9, weekday: 1 }, '0 0 9 * * *'],
		['weekly', { frequency: 'weekly', minute: 15, hour: 18, weekday: 5 }, '0 15 18 * * 5'],
	] as Array<[string, ScheduleDraft, string]>)('writes a %s schedule', (_name, draft, expected) => {
		expect(draftToCron(draft)).toBe(expected);
	});

	it('ignores the fields a frequency does not use', () => {
		// Otherwise switching from weekly to daily would leave the weekday behind
		// and quietly narrow the schedule.
		expect(draftToCron({ frequency: 'daily', minute: 0, hour: 9, weekday: 5 })).toBe('0 0 9 * * *');
	});
});

describe('cronToDraft', () => {
	it.each([
		['0 30 * * * *', { frequency: 'hourly', minute: 30 }],
		['0 0 9 * * *', { frequency: 'daily', minute: 0, hour: 9 }],
		['0 15 18 * * 5', { frequency: 'weekly', minute: 15, hour: 18, weekday: 5 }],
	] as Array<[string, Partial<ScheduleDraft>]>)('reads back %s', (cron, expected) => {
		expect(cronToDraft(cron)).toMatchObject(expected);
	});

	it('survives a round trip', () => {
		const draft: ScheduleDraft = { frequency: 'weekly', minute: 45, hour: 7, weekday: 0 };

		expect(cronToDraft(draftToCron(draft))).toEqual(draft);
	});

	it.each([
		['a five-field expression', '30 9 * * 1'],
		['a step the picker cannot express', '0 */10 * * * *'],
		['a day-of-month restriction', '0 0 9 1 * *'],
		['a non-zero seconds field', '30 0 9 * * *'],
		['nonsense', 'every thursday-ish'],
	])('falls back to the default for %s', (_name, cron) => {
		// Better an obvious default than a wrong-but-plausible choice presented as
		// what is currently saved.
		expect(cronToDraft(cron)).toEqual(DEFAULT_SCHEDULE_DRAFT);
	});
});

describe('summariseOwnSchedules', () => {
	const subscription = (overrides: Partial<CatalogSubscription> = {}): CatalogSubscription => ({
		id: 's1',
		workflowId: 'a',
		workflowName: 'Weekly report',
		cronExpression: '0 0 9 * * *',
		timezone: 'UTC',
		inputs: {},
		enabled: true,
		nextRunAt: '2026-02-01T09:00:00.000Z',
		...overrides,
	});

	it('reports nothing when the person has not subscribed', () => {
		expect(summariseOwnSchedules([])).toEqual({ state: 'none' });
	});

	it('reports the soonest run across several of their own schedules', () => {
		const summary = summariseOwnSchedules([
			subscription({ id: 's1', nextRunAt: '2026-02-03T09:00:00.000Z' }),
			subscription({ id: 's2', nextRunAt: '2026-02-01T09:00:00.000Z' }),
		]);

		// The card answers "when does this next happen for me", not "how many do I have".
		expect(summary).toEqual({
			state: 'scheduled',
			nextRunAt: '2026-02-01T09:00:00.000Z',
			count: 2,
		});
	});

	it('ignores a paused schedule when picking the soonest run', () => {
		const summary = summariseOwnSchedules([
			subscription({ id: 's1', enabled: false, nextRunAt: null }),
			subscription({ id: 's2', nextRunAt: '2026-02-05T09:00:00.000Z' }),
		]);

		expect(summary).toMatchObject({ state: 'scheduled', nextRunAt: '2026-02-05T09:00:00.000Z' });
	});

	it('reports paused when every schedule they hold is paused', () => {
		const summary = summariseOwnSchedules([subscription({ enabled: false, nextRunAt: null })]);

		expect(summary).toEqual({ state: 'paused', count: 1 });
	});
});
