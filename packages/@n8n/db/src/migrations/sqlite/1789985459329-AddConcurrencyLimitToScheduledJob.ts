import { AddConcurrencyLimitToScheduledJob1789985459329 as BaseMigration } from '../common/1789985459329-AddConcurrencyLimitToScheduledJob';

/**
 * Only the rollback needs this: `up` adds its column with raw `ALTER TABLE`, which
 * SQLite does in place.
 *
 * On SQLite, dropping the column's CHECK constraint recreates the whole
 * `scheduled_job` table. `scheduled_task` references it with ON DELETE CASCADE, so
 * the recreate's DROP would cascade and wipe queued tasks. Disable foreign keys for
 * the migration so the drop stays local to `scheduled_job`.
 */
export class AddConcurrencyLimitToScheduledJob1789985459329 extends BaseMigration {
	withFKsDisabled = true as const;
}
