import { AddHeldTasksToScheduler1792747791223 as BaseMigration } from '../common/1792747791223-AddHeldTasksToScheduler';

/**
 * Changing the `kind` CHECK rebuilds `scheduled_job` on SQLite. `scheduled_task`
 * references it with ON DELETE CASCADE, so the rebuild's DROP would wipe queued
 * tasks. Disable foreign keys for the migration.
 */
export class AddHeldTasksToScheduler1792747791223 extends BaseMigration {
	withFKsDisabled = true as const;
}
