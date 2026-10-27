import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'DropInstanceAiIterationLogs1793117284364';

describe('DropInstanceAiIterationLogs Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	const tableName = () => `${context.tablePrefix}instance_ai_iteration_logs`;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		await context.queryRunner.release();
		await Container.get(DbConnection).close();
	});

	it('drops the iteration log table', async () => {
		expect(await context.queryRunner.hasTable(tableName())).toBe(true);
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		expect(await context.queryRunner.hasTable(tableName())).toBe(false);
	});

	it('recreates the table with its columns, index and thread foreign key on revert', async () => {
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		const table = await context.queryRunner.getTable(tableName());
		expect(table?.columns.map((column) => column.name).sort()).toEqual([
			'createdAt',
			'entry',
			'id',
			'taskKey',
			'threadId',
			'updatedAt',
		]);
		// Postgres introspection does not keep the index column order.
		expect(table?.indices.map((index) => [...index.columnNames].sort())).toContainEqual([
			'createdAt',
			'taskKey',
			'threadId',
		]);
		expect(table?.foreignKeys.map((foreignKey) => foreignKey.onDelete)).toEqual(['CASCADE']);
	});
});
