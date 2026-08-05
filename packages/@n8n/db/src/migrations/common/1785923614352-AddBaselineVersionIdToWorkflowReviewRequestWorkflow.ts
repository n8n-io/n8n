import type { MigrationContext, ReversibleMigration } from '../migration-types';

const REVIEW_WORKFLOW_TABLE = 'workflow_review_request_workflow';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';
const BASELINE_VERSION_COLUMN = 'baselineVersionId';

export class AddBaselineVersionIdToWorkflowReviewRequestWorkflow1785923614352
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			REVIEW_WORKFLOW_TABLE,
			[
				column(BASELINE_VERSION_COLUMN)
					.varchar(36)
					.comment('Published workflow_history version captured when the review was approved'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			REVIEW_WORKFLOW_TABLE,
			BASELINE_VERSION_COLUMN,
			[WORKFLOW_HISTORY_TABLE, 'versionId'],
			undefined,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(REVIEW_WORKFLOW_TABLE, BASELINE_VERSION_COLUMN, [
			WORKFLOW_HISTORY_TABLE,
			'versionId',
		]);
		await dropColumns(REVIEW_WORKFLOW_TABLE, [BASELINE_VERSION_COLUMN], {
			recreatesOnSqlite: true,
		});
	}
}
