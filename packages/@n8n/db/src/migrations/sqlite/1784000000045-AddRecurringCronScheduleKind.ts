import { AddRecurringCronScheduleKind1784000000045 as BaseMigration } from '../common/1784000000045-AddRecurringCronScheduleKind';

/**
 * On SQLite, changing the CHECK constraints (both directions) and dropping the
 * recurrence columns recreate the whole `scheduled_job` table. `scheduled_task`
 * references it with ON DELETE CASCADE, so the recreate's DROP would cascade and
 * wipe queued tasks. Disable foreign keys for the migration so the drop stays
 * local to `scheduled_job`.
 */
export class AddRecurringCronScheduleKind1784000000045 extends BaseMigration {
	withFKsDisabled = true as const;
}
