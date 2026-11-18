import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'workflow_test';

/**
 * A Vitest test file for a workflow, written with `@n8n/test`. A workflow has
 * one file today; the index on `workflowId` is not unique so that it can have
 * several later.
 */
export class CreateWorkflowTestTable1795000184359 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('workflowId').varchar(36).notNull,
				column('source').text.notNull.comment('TypeScript source of the test file.'),
				column('lastRun').json.comment(
					'Result of the latest run of the stored source: run status, errors, and one entry for each test. NULL before the first run.',
				),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${TABLE}_workflowId`,
			})
			.withIndexOn('workflowId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
