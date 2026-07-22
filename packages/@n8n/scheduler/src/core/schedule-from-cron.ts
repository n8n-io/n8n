import type { Cron } from 'n8n-workflow';

import type { Schedule } from './types';

/**
 * Pick the best-fitting scheduler {@link Schedule} kind for one trigger cron rule.
 * The single mapping shared by the Schedule Trigger and Poll Trigger durable
 * registrars, so both represent an equivalent cadence identically (and so a
 * poll job's identity stays put the same way a schedule job's does).
 *
 * - A second/minute cadence becomes an `interval` job in `new` mode (a steady
 *   elapsed-time cadence); in `legacy` mode it stays a plain clock-aligned `cron`.
 * - An "every N periods" calendar cadence with N >= 2 becomes a `recurring_cron`
 *   job: the cron expression names the candidate instants and the job fires on
 *   every Nth of them.
 * - Everything else (every-1 calendar cadences and a raw cron field) is a plain
 *   `cron` job.
 *
 * @param cron The rule's cron expression plus its `source`/`recurrence` metadata.
 * @param timezone The rule's timezone, or `null` for the instance default.
 * @param triggerNodeMode Whether a fixed second/minute cadence is an elapsed-time
 *   `interval` (`new`) or a clock-aligned `cron` (`legacy`).
 */
export function cronToSchedule(
	cron: Cron,
	timezone: string | null,
	triggerNodeMode: 'legacy' | 'new',
): Schedule {
	const { expression, recurrence, source } = cron;

	if (
		triggerNodeMode === 'new' &&
		source?.size !== undefined &&
		(source.field === 'seconds' || source.field === 'minutes')
	) {
		const intervalSeconds = source.field === 'minutes' ? source.size * 60 : source.size;
		return { kind: 'interval', intervalSeconds };
	}

	// N = 1 keeps every candidate instant, which the cron expression alone already
	// expresses; only N >= 2 needs the recurring_cron filter.
	if (recurrence?.activated && recurrence.intervalSize >= 2) {
		return {
			kind: 'recurring_cron',
			cronExpression: expression,
			timezone,
			recurrenceUnit: recurrence.typeInterval,
			recurrenceSize: recurrence.intervalSize,
		};
	}

	return { kind: 'cron', cronExpression: expression, timezone };
}
