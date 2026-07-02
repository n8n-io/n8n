import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import { type CronExpression, UnexpectedError } from 'n8n-workflow';

import type { Schedule, ScheduledJob } from '../core/types';

/**
 * Maps the flat `@n8n/db` entity rows to the scheduler's domain types.
 * The entities store a schedule as discriminator + per-kind columns; the domain
 * carries it as a `Schedule` union. Kept as pure functions so it's unit-testable
 * without a database.
 */

/** Assemble the domain `Schedule` union from a job row's discriminator + columns. */
function toSchedule(entity: ScheduledJobEntity, instanceTimezone: string): Schedule {
	switch (entity.kind) {
		case 'cron':
			// The DB column is a plain varchar validated on write; narrow to the
			// branded type at this boundary.
			return {
				kind: 'cron',
				cronExpression: required(entity, 'cronExpression') as CronExpression,
				timezone: entity.timezone ?? instanceTimezone,
			};
		case 'interval':
			return { kind: 'interval', intervalSeconds: required(entity, 'intervalSeconds') };
		case 'one_off':
			return { kind: 'one_off', fireAt: required(entity, 'fireAt') };
	}
}

/** Read a column that the kind's CHECK constraint guarantees is set; a null here is a corrupt row. */
function required<K extends keyof ScheduledJobEntity>(
	entity: ScheduledJobEntity,
	key: K,
): NonNullable<ScheduledJobEntity[K]> {
	const value = entity[key];
	if (value === null || value === undefined) {
		throw new UnexpectedError(
			`scheduled_job ${entity.id} of kind '${entity.kind}' is missing '${String(key)}'`,
		);
	}
	return value as NonNullable<ScheduledJobEntity[K]>;
}

/**
 * @param instanceTimezone the instance-default IANA zone, used to resolve a cron
 * job's null timezone before it reaches the recurrence math.
 */
export function entityToScheduledJob(
	entity: ScheduledJobEntity,
	instanceTimezone: string,
): ScheduledJob {
	return {
		id: String(entity.id),
		schedule: toSchedule(entity, instanceTimezone),
		enabled: entity.enabled,
		nextRunAt: entity.nextRunAt,
		lastFiredAt: entity.lastFiredAt,
		taskType: entity.taskType,
		payload: entity.payload,
		maxAttempts: entity.maxAttempts,
	};
}
