import type { ScheduledJob } from '@n8n/db';
import type { ScheduleDefinition } from '@n8n/scheduler';
import { UnexpectedError } from 'n8n-workflow';

/**
 * The mapping between a `ScheduleDefinition` (a discriminated union, one
 * variant per kind) and the flat `scheduled_job` schedule columns. The flat
 * shape is a persistence detail, so both directions live here at the DB
 * boundary.
 */

/** A job row's schedule columns: one `ScheduleDefinition` flattened for storage. */
export type ScheduleColumns = Pick<
	ScheduledJob,
	| 'kind'
	| 'cronExpression'
	| 'timezone'
	| 'recurrenceUnit'
	| 'recurrenceSize'
	| 'intervalSeconds'
	| 'fireAt'
>;

/** Flatten a {@link ScheduleDefinition} into the row columns it stores; absent fields are null. */
export function scheduleColumns(schedule: ScheduleDefinition): ScheduleColumns {
	const empty = {
		cronExpression: null,
		timezone: null,
		recurrenceUnit: null,
		recurrenceSize: null,
		intervalSeconds: null,
		fireAt: null,
	};
	switch (schedule.kind) {
		case 'cron':
			return {
				...empty,
				kind: schedule.kind,
				cronExpression: schedule.cronExpression,
				timezone: schedule.timezone,
			};
		case 'recurring_cron':
			return {
				...empty,
				kind: schedule.kind,
				cronExpression: schedule.cronExpression,
				timezone: schedule.timezone,
				recurrenceUnit: schedule.recurrenceUnit,
				recurrenceSize: schedule.recurrenceSize,
			};
		case 'interval':
			return { ...empty, kind: schedule.kind, intervalSeconds: schedule.intervalSeconds };
		case 'one_off':
			return { ...empty, kind: schedule.kind, fireAt: schedule.fireAt };
	}
}

/**
 * Rebuild a {@link ScheduleDefinition} from a stored row, so provisioning can
 * diff it against the desired schedule. Rows are written by {@link scheduleColumns},
 * so a row of a given kind always carries that kind's columns; the coalescing only
 * guards a hand-corrupted row, which then reads as changed and is rewritten.
 *
 * A `kind` outside the known set (a row from a newer main during a mixed-version
 * deploy, a rollback, or a hand-edit) can't be diffed, so it throws rather than
 * returning `undefined` and tripping a downstream `sameSchedule` on a bad value.
 */
export function rowSchedule(row: ScheduledJob): ScheduleDefinition {
	switch (row.kind) {
		case 'cron':
			return { kind: 'cron', cronExpression: row.cronExpression ?? '', timezone: row.timezone };
		case 'recurring_cron':
			return {
				kind: 'recurring_cron',
				cronExpression: row.cronExpression ?? '',
				timezone: row.timezone,
				recurrenceUnit: row.recurrenceUnit ?? 'hours',
				recurrenceSize: row.recurrenceSize ?? 0,
			};
		case 'interval':
			return { kind: 'interval', intervalSeconds: row.intervalSeconds ?? 0 };
		case 'one_off':
			return { kind: 'one_off', fireAt: row.fireAt ?? new Date(0) };
		default: {
			const exhaustive: never = row.kind;
			throw new UnexpectedError(`Unexpected scheduled job kind: ${JSON.stringify(exhaustive)}`);
		}
	}
}
