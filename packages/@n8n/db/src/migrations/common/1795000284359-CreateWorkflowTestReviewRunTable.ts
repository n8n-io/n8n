import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'workflow_test_review_run';

/**
 * A run of the workflow tests on the version that a workflow review pins.
 * Approval of the review needs a passed run on the pinned version.
 */
export class CreateWorkflowTestReviewRunTable1795000284359 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('workflowReviewRequestId').varchar(36).notNull,
				column('workflowId').varchar(36).notNull,
				column('workflowVersionId')
					.varchar(36)
					.notNull.comment('The workflow history version that the tests ran on.'),
				column('status').varchar(16).notNull.comment('One of running, passed, failed, or error.'),
				column('result').json.comment(
					'Result of the run: run status, errors, and one entry for each test. NULL while the run is in progress.',
				),
			)
			.withForeignKey('workflowReviewRequestId', {
				tableName: 'workflow_review_request',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${TABLE}_workflowReviewRequestId`,
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${TABLE}_workflowId`,
			})
			.withIndexOn(['workflowReviewRequestId', 'workflowId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
