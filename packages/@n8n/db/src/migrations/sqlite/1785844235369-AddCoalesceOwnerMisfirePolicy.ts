import { AddCoalesceOwnerMisfirePolicy1785844235369 as BaseMigration } from '../common/1785844235369-AddCoalesceOwnerMisfirePolicy';

/**
 * Swapping the `misfirePolicy` CHECK recreates the whole `scheduled_job` table on SQLite,
 * on the way up as well as down. `scheduled_task` references it with ON DELETE CASCADE,
 * so the recreate's DROP would cascade and wipe queued tasks.
 *
 * Only the rollback needs this flag: for `up`, TypeORM's own `beforeMigration` hook
 * already issues `PRAGMA foreign_keys = OFF` before the migration transaction opens. On
 * the rollback path it issues that pragma inside the transaction, where SQLite ignores
 * it, so this flag is what keeps the drop local to `scheduled_job` there.
 */
export class AddCoalesceOwnerMisfirePolicy1785844235369 extends BaseMigration {
	withFKsDisabled = true as const;
}
