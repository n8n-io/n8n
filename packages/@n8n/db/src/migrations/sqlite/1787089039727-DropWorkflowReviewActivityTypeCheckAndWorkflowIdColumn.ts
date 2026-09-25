import { DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1787089039727 as BaseMigration } from '../common/1787089039727-DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn';

/**
 * Dropping the CHECK and the column each recreate `workflow_review_activity` on SQLite, and
 * `workflow_review_activity_comment` references it with ON DELETE CASCADE — the recreation would
 * take every comment row with it. Disable FKs for the migration's duration.
 */
export class DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1787089039727 extends BaseMigration {
	withFKsDisabled = true as const;
}
