import type {
	ScheduledJob as ScheduledJobEntity,
	ScheduledTask as ScheduledTaskEntity,
} from '@n8n/db';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { type CronExpression, UnexpectedError } from 'n8n-workflow';

import type { Schedule, ScheduledJob, ScheduledTask } from '../core/types';

/**
 * Maps between the flat `@n8n/db` entity rows and the scheduler's domain types.
 * The entities store a schedule as discriminator + per-kind columns; the domain
 * carries it as a `Schedule` union. Kept as pure functions so it's unit-testable
 * without a database.
 */

/** Assemble the domain `Schedule` union from a job row's discriminator + columns. */
function toSchedule(entity: ScheduledJobEntity): Schedule {
	switch (entity.kind) {
		case 'cron':
			// The DB column is a plain varchar validated on write; narrow to the
			// branded type at this boundary.
			return {
				kind: 'cron',
				cronExpression: required(entity, 'cronExpression') as CronExpression,
				timezone: entity.timezone,
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

export function entityToScheduledJob(entity: ScheduledJobEntity): ScheduledJob {
	return {
		id: String(entity.id),
		schedule: toSchedule(entity),
		enabled: entity.enabled,
		nextRunAt: entity.nextRunAt,
		lastFiredAt: entity.lastFiredAt,
		taskType: entity.taskType,
		payload: entity.payload,
		maxAttempts: entity.maxAttempts,
	};
}

/**
 * The columns to insert for a new occurrence. The generated `id` and the
 * coordination columns (claim/lease/timestamps) are left to their DB defaults.
 */
export function scheduledTaskToRow(
	task: ScheduledTask,
): QueryDeepPartialEntity<ScheduledTaskEntity> {
	return {
		jobId: Number(task.jobId),
		taskType: task.taskType,
		// The domain payload is `unknown`; the entity's json column is
		// `Record<string, unknown>`. Cast only this field to the column's insert type.
		payload: task.payload as QueryDeepPartialEntity<ScheduledTaskEntity>['payload'],
		scheduledFor: task.scheduledFor,
		runAt: task.runAt,
		status: task.status,
		attempts: task.attempts,
		maxAttempts: task.maxAttempts,
	};
}
