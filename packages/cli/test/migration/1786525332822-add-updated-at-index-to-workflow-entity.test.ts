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

const MIGRATION_NAME = 'AddUpdatedAtIndexToWorkflowEntity1786525332822';

/** Index names are prefixed per-install, so match on the indexed column instead. */
async function updatedAtIndexExists(context: TestMigrationContext): Promise<boolean> {
	const ds = Container.get(DataSource);

	const indexesUpdatedAt = /\(\s*"?updatedAt"?\s*\)/;

	if (context.isPostgres) {
		const rows = await ds.query<Array<{ indexdef: string }>>(
			'SELECT indexdef FROM pg_indexes WHERE tablename = $1',
			[`${context.tablePrefix}workflow_entity`],
		);
		return rows.some((r) => indexesUpdatedAt.test(r.indexdef));
	}

	const rows = await ds.query<Array<{ sql: string | null }>>(
		"SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ?",
		[`${context.tablePrefix}workflow_entity`],
	);
	return rows.some((r) => r.sql !== null && indexesUpdatedAt.test(r.sql));
}

describe(MIGRATION_NAME, () => {
	let context: TestMigrationContext;
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	beforeEach(async () => {
		const reset = createTestMigrationContext(dataSource);
		await reset.queryRunner.clearDatabase();
		await reset.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	it('adds an index on workflow_entity.updatedAt', async () => {
		expect(await updatedAtIndexExists(context)).toBe(false);

		await runSingleMigration(MIGRATION_NAME);

		expect(await updatedAtIndexExists(context)).toBe(true);
	});

	it('removes the index again on revert', async () => {
		await runSingleMigration(MIGRATION_NAME);
		expect(await updatedAtIndexExists(context)).toBe(true);

		await undoLastSingleMigration();

		expect(await updatedAtIndexExists(context)).toBe(false);
	});
});
