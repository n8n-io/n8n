import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateAgentTagMappingTable1794239569285';

describe('CreateAgentTagMappingTable Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	it('creates the agents_tags join table with both cascading foreign keys', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const context = createTestMigrationContext(dataSource);

		expect(await context.queryRunner.hasTable(`${context.tablePrefix}agents_tags`)).toBe(true);
		const table = await context.queryRunner.getTable(`${context.tablePrefix}agents_tags`);
		expect(table?.columns.map((column) => column.name)).toEqual(['agentId', 'tagId']);
		// A missing FK would silently drop the delete cascade, so assert both
		// pairs exactly instead of only checking the ones that exist.
		expect(table?.foreignKeys).toHaveLength(2);
		expect(table?.foreignKeys).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					columnNames: ['agentId'],
					referencedTableName: `${context.tablePrefix}agents`,
					referencedColumnNames: ['id'],
					onDelete: 'CASCADE',
				}),
				expect.objectContaining({
					columnNames: ['tagId'],
					referencedTableName: `${context.tablePrefix}tag_entity`,
					referencedColumnNames: ['id'],
					onDelete: 'CASCADE',
				}),
			]),
		);

		await context.queryRunner.release();
	});

	it('rolls back cleanly and can be applied again', async () => {
		const hasTable = async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				return await context.queryRunner.hasTable(`${context.tablePrefix}agents_tags`);
			} finally {
				await context.queryRunner.release();
			}
		};

		await runSingleMigration(MIGRATION_NAME);
		expect(await hasTable()).toBe(true);

		await undoLastSingleMigration();
		expect(await hasTable()).toBe(false);

		await runSingleMigration(MIGRATION_NAME);
		expect(await hasTable()).toBe(true);
	});
});
