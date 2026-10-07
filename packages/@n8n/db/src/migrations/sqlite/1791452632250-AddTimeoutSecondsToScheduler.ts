import { AddTimeoutSecondsToScheduler1791452632250 as BaseMigration } from '../common/1791452632250-AddTimeoutSecondsToScheduler';

/**
 * Only the rollback needs this: on SQLite, dropping a CHECK rebuilds the table.
 * `scheduled_task` references `scheduled_job` with ON DELETE CASCADE, so the
 * rebuild's DROP would wipe queued tasks. Disable foreign keys for the migration.
 */
export class AddTimeoutSecondsToScheduler1791452632250 extends BaseMigration {
	withFKsDisabled = true as const;
}
