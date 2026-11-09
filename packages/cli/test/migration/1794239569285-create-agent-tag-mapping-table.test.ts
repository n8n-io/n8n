import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
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

	it('creates the agents_tags join table with both foreign keys', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const context = createTestMigrationContext(dataSource);

		expect(await context.queryRunner.hasTable(`${context.tablePrefix}agents_tags`)).toBe(true);
		const table = await context.queryRunner.getTable(`${context.tablePrefix}agents_tags`);
		expect(table?.columns.map((column) => column.name)).toEqual(['agentId', 'tagId']);

		// Deleting an agent or a tag removes its mappings.
		for (const foreignKey of table?.foreignKeys ?? []) {
			expect(foreignKey.onDelete).toBe('CASCADE');
		}

		await context.queryRunner.release();
	});
});
