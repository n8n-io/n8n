import { AddRecurringCronScheduleKind1784000000044 as BaseMigration } from '../common/1784000000044-AddRecurringCronScheduleKind';

/**
 * On SQLite, widening the `kind` CHECK and adding the presence CHECK recreate the
 * whole `scheduled_job` table. `scheduled_task` references it with ON DELETE
 * CASCADE, so the recreate's DROP would cascade and wipe queued tasks. Disable
 * foreign keys for the migration so the drop stays local to `scheduled_job`.
 */
export class AddRecurringCronScheduleKind1784000000044 extends BaseMigration {
	withFKsDisabled = true as const;
}
