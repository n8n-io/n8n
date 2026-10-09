import { AddTimeoutSecondsToScheduler1791542683581 as BaseMigration } from '../common/1791542683581-AddTimeoutSecondsToScheduler';

/**
 * Only the rollback needs this: on SQLite, dropping a CHECK rebuilds the table.
 * `scheduled_task` references `scheduled_job` with ON DELETE CASCADE, so the
 * rebuild's DROP would wipe queued tasks. Disable foreign keys for the migration.
 */
export class AddTimeoutSecondsToScheduler1791542683581 extends BaseMigration {
	withFKsDisabled = true as const;
}
