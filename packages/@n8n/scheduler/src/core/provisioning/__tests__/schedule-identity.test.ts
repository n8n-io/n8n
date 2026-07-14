import { sameSchedule, scheduleFingerprint } from '../schedule-identity';
import type { ScheduleDefinition } from '../types';

const dailyAtNine: ScheduleDefinition = {
	kind: 'cron',
	cronExpression: '0 0 9 * * *',
	timezone: null,
};

/**
 * Pairwise-distinct definitions: each differs from `dailyAtNine` (or from its
 * neighbours) in exactly one identity-relevant aspect, so a fingerprint that
 * ignores any field would produce a collision here.
 */
const distinctDefinitions: ScheduleDefinition[] = [
	dailyAtNine,
	{ ...dailyAtNine, cronExpression: '0 0 10 * * *' },
	{ ...dailyAtNine, timezone: 'Europe/Berlin' },
	{
		kind: 'recurring_cron',
		cronExpression: '0 0 9 * * *',
		timezone: null,
		recurrenceUnit: 'weeks',
		recurrenceSize: 2,
	},
	{
		kind: 'recurring_cron',
		cronExpression: '0 0 9 * * *',
		timezone: null,
		recurrenceUnit: 'weeks',
		recurrenceSize: 3,
	},
	{
		kind: 'recurring_cron',
		cronExpression: '0 0 9 * * *',
		timezone: null,
		recurrenceUnit: 'months',
		recurrenceSize: 2,
	},
	{ kind: 'interval', intervalSeconds: 30 },
	{ kind: 'interval', intervalSeconds: 60 },
	{ kind: 'one_off', fireAt: new Date('2026-01-05T09:00:00.000Z') },
	{ kind: 'one_off', fireAt: new Date('2026-01-05T10:00:00.000Z') },
];

describe('scheduleFingerprint', () => {
	it('is a deterministic 16-hex digest, identical for structurally equal definitions', () => {
		for (const schedule of distinctDefinitions) {
			const fingerprint = scheduleFingerprint(schedule, true);
			expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
			// A fresh structural clone, not the same reference: what a second
			// instance recomputing the rule from the same node would hold.
			const clone =
				schedule.kind === 'one_off'
					? { ...schedule, fireAt: new Date(schedule.fireAt) }
					: { ...schedule };
			expect(scheduleFingerprint(clone, true)).toBe(fingerprint);
		}
	});

	it('agrees with sameSchedule: equal fingerprints exactly for equal definitions', () => {
		for (const a of distinctDefinitions) {
			for (const b of distinctDefinitions) {
				expect(scheduleFingerprint(a, true) === scheduleFingerprint(b, true)).toBe(
					sameSchedule(a, b),
				);
			}
		}
	});

	it('distinguishes a live rule from a clock-dead one of the same shape', () => {
		expect(scheduleFingerprint(dailyAtNine, true)).not.toBe(
			scheduleFingerprint(dailyAtNine, false),
		);
	});
});
