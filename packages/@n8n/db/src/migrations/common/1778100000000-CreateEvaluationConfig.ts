import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'evaluation_config';

export class CreateEvaluationConfig1778100000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('workflowId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('status').varchar(16).notNull.default("'valid'"),
				column('invalidReason').varchar(64),
				column('datasetSource').varchar(32).notNull,
				column('datasetRef').json.notNull,
				column('startNodeName').varchar(255).notNull,
				column('endNodeName').varchar(255).notNull,
				column('metrics').json.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('workflowId')
			.withUniqueConstraintOn(['workflowId', 'name']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
