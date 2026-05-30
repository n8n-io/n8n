import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'WidenAgentThreadIdColumns1784000000019';

const WIDENED_COLUMNS: Array<{ table: string; column: string }> = [
	{ table: 'agents_threads', column: 'id' },
	{ table: 'agent_execution_threads', column: 'id' },
	{ table: 'agent_execution', column: 'threadId' },
];

describe('WidenAgentThreadIdColumns Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/** Read the declared/effective type of a column. */
	async function getColumnType(
		context: TestMigrationContext,
		tableName: string,
		columnName: string,
	): Promise<string> {
		if (context.isPostgres) {
			const result = await context.queryRunner.query(
				`SELECT data_type, character_maximum_length
				 FROM information_schema.columns
				 WHERE table_name = $1 AND column_name = $2`,
				[`${context.tablePrefix}${tableName}`, columnName],
			);
			return `${result[0]?.data_type}(${result[0]?.character_maximum_length})`;
		}
		const result = await context.queryRunner.query(
			`PRAGMA table_info(${context.escape.tableName(tableName)})`,
		);
		const column = result.find((col: { name: string }) => col.name === columnName);
		return column?.type ?? 'unknown';
	}

	it('runs cleanly and widens the thread id columns to varchar(255) on Postgres', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const context = createTestMigrationContext(dataSource);

		// SQLite does not enforce VARCHAR length, so the migration is a no-op
		// there and the declared type is left untouched — only Postgres widens.
		if (context.isPostgres) {
			for (const { table, column } of WIDENED_COLUMNS) {
				expect(await getColumnType(context, table, column)).toBe('character varying(255)');
			}
		}

		await context.queryRunner.release();
	});
});
