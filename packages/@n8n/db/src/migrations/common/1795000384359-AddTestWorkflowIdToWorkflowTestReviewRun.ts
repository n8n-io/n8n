import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'workflow_test_review_run';

/**
 * A review of a sub-workflow also runs the tests of the workflows that call it.
 * `testWorkflowId` names the workflow whose test file ran.
 */
export class AddTestWorkflowIdToWorkflowTestReviewRun1795000384359 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// The table has no incoming foreign keys, so the SQLite recreation keeps all data.
		await addColumns(
			TABLE,
			[
				column('testWorkflowId')
					.varchar(36)
					.comment(
						'The workflow whose test file ran: the reviewed workflow, or a workflow that calls it. NULL on rows from before this column, which ran the tests of the reviewed workflow.',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE, ['testWorkflowId'], { recreatesOnSqlite: true });
	}
}
