import type { MigrationContext, ReversibleMigration } from '../migration-types';

const EVALUATION_COLLECTION_TABLE = 'evaluation_collection';
const TEST_RUN_TABLE = 'test_run';
const EVALUATION_CONFIG_TABLE = 'evaluation_config';
const WORKFLOW_TABLE = 'workflow_entity';
const FK_TEST_RUN_COLLECTION = 'FK_test_run_collection_id';

export class CreateEvaluationCollection1778496086558 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, addForeignKey, createIndex, column },
	}: MigrationContext) {
		await createTable(EVALUATION_COLLECTION_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').text,
				column('workflowId').varchar(36).notNull,
				column('evaluationConfigId').varchar(36).notNull,
				column('createdById').varchar(36),
				column('insightsCache').json,
			)
			.withForeignKey('workflowId', {
				tableName: WORKFLOW_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('evaluationConfigId', {
				tableName: EVALUATION_CONFIG_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('workflowId')
			.withIndexOn('evaluationConfigId').withTimestamps;

		await addColumns(TEST_RUN_TABLE, [column('collectionId').varchar(36)]);

		await addForeignKey(
			TEST_RUN_TABLE,
			'collectionId',
			[EVALUATION_COLLECTION_TABLE, 'id'],
			FK_TEST_RUN_COLLECTION,
			'SET NULL',
		);

		await createIndex(TEST_RUN_TABLE, ['collectionId']);
	}

	async down({
		schemaBuilder: { dropColumns, dropTable, dropForeignKey, dropIndex },
	}: MigrationContext) {
		await dropIndex(TEST_RUN_TABLE, ['collectionId']);
		await dropForeignKey(
			TEST_RUN_TABLE,
			'collectionId',
			[EVALUATION_COLLECTION_TABLE, 'id'],
			FK_TEST_RUN_COLLECTION,
		);
		await dropColumns(TEST_RUN_TABLE, ['collectionId']);
		await dropTable(EVALUATION_COLLECTION_TABLE);
	}
}
