import { GeneralizeScheduledJobOwner1787306400000 as BaseMigration } from '../common/1787306400000-GeneralizeScheduledJobOwner';

/**
 * Adding the owner columns, making two of them NOT NULL and dropping
 * `workflowId`/`nodeId` each recreate the whole `scheduled_job` table on
 * SQLite, on the way up as well as down. `scheduled_task` references it with
 * ON DELETE CASCADE, so each recreate's DROP would cascade and wipe queued
 * tasks. Disable FKs for the migration's duration.
 */
export class GeneralizeScheduledJobOwner1787306400000 extends BaseMigration {
	withFKsDisabled = true as const;
}
