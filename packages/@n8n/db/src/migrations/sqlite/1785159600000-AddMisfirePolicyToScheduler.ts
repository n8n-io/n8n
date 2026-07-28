import { AddMisfirePolicyToScheduler1785159600000 as BaseMigration } from '../common/1785159600000-AddMisfirePolicyToScheduler';

/**
 * On SQLite, dropping the policy CHECK constraints and their columns recreates the
 * whole `scheduled_job` table. `scheduled_task` references it with ON DELETE CASCADE,
 * so the recreate's DROP would cascade and wipe queued tasks. Disable foreign keys for
 * the migration so the drop stays local to `scheduled_job`.
 */
export class AddMisfirePolicyToScheduler1785159600000 extends BaseMigration {
	withFKsDisabled = true as const;
}
