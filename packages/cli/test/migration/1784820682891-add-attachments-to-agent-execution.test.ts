import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddAttachmentsToAgentExecution1784820682891';

describe('AddAttachmentsToAgentExecution Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function hasAttachmentsColumn(): Promise<boolean> {
		const context = createTestMigrationContext(dataSource);
		try {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			return table?.columns.some((column) => column.name === 'attachments') ?? false;
		} finally {
			await context.queryRunner.release();
		}
	}

	it('adds a nullable attachments column', async () => {
		expect(await hasAttachmentsColumn()).toBe(true);
	});

	it('drops the column on revert and can be re-applied', async () => {
		await dataSource.undoLastMigration({ transaction: 'each' });
		expect(await hasAttachmentsColumn()).toBe(false);

		await runSingleMigration(MIGRATION_NAME);
		expect(await hasAttachmentsColumn()).toBe(true);
	});
});
