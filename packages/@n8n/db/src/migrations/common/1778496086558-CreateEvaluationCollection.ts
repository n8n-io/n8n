import type { MigrationContext, ReversibleMigration } from '../migration-types';

const EVALUATION_COLLECTION_TABLE = 'evaluation_collection';
const TEST_RUN_TABLE = 'test_run';
const EVALUATION_CONFIG_TABLE = 'evaluation_config';
const WORKFLOW_TABLE = 'workflow_entity';
const USER_TABLE = 'user';
const FK_TEST_RUN_COLLECTION = 'FK_test_run_collection_id';

export class CreateEvaluationCollection1778496086558 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, addForeignKey, createIndex, column },
		queryRunner,
		isSqlite,
	}: MigrationContext) {
		await createTable(EVALUATION_COLLECTION_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').text,
				column('workflowId').varchar(36).notNull,
				column('evaluationConfigId').varchar(36).notNull,
				column('createdById').uuid,
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
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withIndexOn('workflowId')
			.withIndexOn('evaluationConfigId').withTimestamps;

		// On SQLite, `addColumns` and `addForeignKey` both trigger a full
		// table rebuild via TypeORM's cached `Table` metadata. The prior
		// migration `1778100002000-AddEvaluationConfigColumnsToTestRun`
		// added the `evaluationConfigSnapshot` column on SQLite via raw
		// `ALTER TABLE ADD COLUMN`, which TypeORM doesn't observe — so its
		// cached metadata is stale by the time this migration runs. Without
		// this refresh, the next rebuild silently drops the column and
		// every subsequent `TestRun` insert fails with
		// "SQLITE_ERROR: table test_run has no column named
		// evaluationConfigSnapshot". `queryRunner.getTable()` reloads from
		// PRAGMA table_info so the rebuild reads the actual current schema.
		if (isSqlite) {
			await queryRunner.getTable(TEST_RUN_TABLE);
		}

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
