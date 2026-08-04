import { AddCoalesceOwnerMisfirePolicy1785844235369 as BaseMigration } from '../common/1785844235369-AddCoalesceOwnerMisfirePolicy';

/**
 * Both directions need this: swapping the `misfirePolicy` CHECK recreates the whole
 * `scheduled_job` table on SQLite, on the way up as well as down. `scheduled_task`
 * references it with ON DELETE CASCADE, so the recreate's DROP would cascade and wipe
 * queued tasks. Disable foreign keys for the migration so the drop stays local to
 * `scheduled_job`.
 */
export class AddCoalesceOwnerMisfirePolicy1785844235369 extends BaseMigration {
	withFKsDisabled = true as const;
}
