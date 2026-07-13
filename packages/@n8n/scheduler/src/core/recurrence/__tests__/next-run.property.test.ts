import fc from 'fast-check';
import type { CronExpression } from 'n8n-workflow';

import { computeNextRunAt } from '../next-run';

/**
 * The core recurrence guarantee, over a wide range of instants and schedules:
 * the next run is always strictly after `after` for unbounded schedules, an
 * interval lands exactly one period on, and a one-off fires once then exhausts.
 */
describe('computeNextRunAt (fast-check)', () => {
	// Bounded well inside cron-parser's supported range to avoid overflow.
	const arbAfter = fc.date({
		min: new Date('2001-01-01T00:00:00.000Z'),
		max: new Date('2099-01-01T00:00:00.000Z'),
	});

	it('interval: lands exactly one period after, strictly forward', () => {
		fc.assert(
			fc.property(arbAfter, fc.integer({ min: 1, max: 1_000_000 }), (after, intervalSeconds) => {
				const next = computeNextRunAt({ kind: 'interval', intervalSeconds }, after);
				expect(next).not.toBeNull();
				expect(next!.getTime()).toBe(after.getTime() + intervalSeconds * 1000);
			}),
		);
	});

	it('interval: repeated application is a strictly increasing sequence', () => {
		fc.assert(
			fc.property(arbAfter, fc.integer({ min: 1, max: 100_000 }), (after, intervalSeconds) => {
				const schedule = { kind: 'interval' as const, intervalSeconds };
				let prev = after;
				for (let i = 0; i < 5; i++) {
					const next = computeNextRunAt(schedule, prev)!;
					expect(next.getTime()).toBeGreaterThan(prev.getTime());
					prev = next;
				}
			}),
		);
	});

	const arbCron = fc.constantFrom<string>(
		'0 * * * * *',
		'0 0 * * * *',
		'0 0 0 * * *',
		'0 30 9 * * 1-5',
		'0 0 0 1 * *',
	);
	const arbTimezone = fc.constantFrom(
		'UTC',
		'Europe/Berlin',
		'America/New_York',
		'Asia/Kolkata',
		'Pacific/Auckland',
	);

	it('cron: next fire is strictly after `after` in any supported timezone', () => {
		fc.assert(
			fc.property(arbAfter, arbCron, arbTimezone, (after, cronExpression, timezone) => {
				const next = computeNextRunAt(
					{ kind: 'cron', cronExpression: cronExpression as CronExpression, timezone },
					after,
				);
				expect(next).not.toBeNull();
				expect(next!.getTime()).toBeGreaterThan(after.getTime());
			}),
		);
	});

	it('one-off: fires at `fireAt` when future, exhausts otherwise', () => {
		fc.assert(
			fc.property(arbAfter, arbAfter, (after, fireAt) => {
				const result = computeNextRunAt({ kind: 'one_off', fireAt }, after);
				if (fireAt.getTime() > after.getTime()) {
					expect(result).toEqual(fireAt);
				} else {
					expect(result).toBeNull();
				}
			}),
		);
	});
});
