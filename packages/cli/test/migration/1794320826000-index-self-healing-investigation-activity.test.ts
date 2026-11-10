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

const migrationName = 'IndexSelfHealingInvestigationActivity1794320826000';

async function withQueryRunner<T>(operation: (context: TestMigrationContext) => Promise<T>) {
	const context = createTestMigrationContext(Container.get(DataSource));
	try {
		return await operation(context);
	} finally {
		await context.queryRunner.release();
	}
}

async function indexColumns() {
	return await withQueryRunner(async ({ queryRunner, tablePrefix }) => {
		const table = await queryRunner.getTable(`${tablePrefix}self_healing_investigation`);
		// PostgreSQL index introspection does not preserve the column order.
		return table?.indices.map(({ columnNames }) => columnNames.toSorted());
	});
}

beforeAll(async () => {
	await Container.get(DbConnection).init();
	await withQueryRunner(async ({ queryRunner }) => await queryRunner.clearDatabase());
	await initDbUpToMigration(migrationName);
});

afterAll(async () => await Container.get(DbConnection).close());

it('replaces the configuration index with a configuration and date index, and reverts it', async () => {
	expect(await indexColumns()).toContainEqual(['configurationId']);

	await runSingleMigration(migrationName);
	expect(await indexColumns()).toContainEqual(['configurationId', 'createdAt']);
	expect(await indexColumns()).not.toContainEqual(['configurationId']);

	await undoLastSingleMigration();
	expect(await indexColumns()).toContainEqual(['configurationId']);
	expect(await indexColumns()).not.toContainEqual(['configurationId', 'createdAt']);
});
