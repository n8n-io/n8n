import { DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1786893802707 as BaseMigration } from '../common/1786893802707-DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn';

/**
 * Dropping the CHECK and the column each recreate `workflow_review_activity` on SQLite, and
 * `workflow_review_activity_comment` references it with ON DELETE CASCADE — the recreation would
 * take every comment row with it. Disable FKs for the migration's duration.
 */
export class DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1786893802707 extends BaseMigration {
	withFKsDisabled = true as const;
}
