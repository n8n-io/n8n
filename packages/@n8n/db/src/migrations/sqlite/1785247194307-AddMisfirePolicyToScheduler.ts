import { AddMisfirePolicyToScheduler1785247194307 as BaseMigration } from '../common/1785247194307-AddMisfirePolicyToScheduler';

/**
 * Only the rollback needs this: `up` adds its columns with raw `ALTER TABLE`, which
 * SQLite does in place.
 *
 * On SQLite, dropping the policy CHECK constraints and their columns recreates the
 * whole `scheduled_job` table. `scheduled_task` references it with ON DELETE CASCADE,
 * so the recreate's DROP would cascade and wipe queued tasks. Disable foreign keys for
 * the migration so the drop stays local to `scheduled_job`.
 */
export class AddMisfirePolicyToScheduler1785247194307 extends BaseMigration {
	withFKsDisabled = true as const;
}
