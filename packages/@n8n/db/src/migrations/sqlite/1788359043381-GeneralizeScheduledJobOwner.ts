import { GeneralizeScheduledJobOwner1788359043381 as BaseMigration } from '../common/1788359043381-GeneralizeScheduledJobOwner';

/**
 * Every column change here recreates the whole `scheduled_job` table on SQLite,
 * up as well as down. `scheduled_task` references it with ON DELETE CASCADE, so
 * each recreate's DROP would wipe queued tasks.
 */
export class GeneralizeScheduledJobOwner1788359043381 extends BaseMigration {
	withFKsDisabled = true as const;
}
