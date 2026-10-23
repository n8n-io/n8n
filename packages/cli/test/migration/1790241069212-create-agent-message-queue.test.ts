import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateAgentMessageQueue1790241069212';

describe('CreateAgentMessageQueue migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function hasTable(name: string): Promise<boolean> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await context.queryRunner.hasTable(`${context.tablePrefix}${name}`);
		} finally {
			await context.queryRunner.release();
		}
	}

	it('adds, removes, and restores the queue without removing execution history tables', async () => {
		await runSingleMigration(MIGRATION_NAME);
		expect(await hasTable('agent_message_queue')).toBe(true);
		await dataSource.undoLastMigration({ transaction: 'each' });
		expect(await hasTable('agent_message_queue')).toBe(false);
		for (const table of ['agent_execution_threads', 'agent_execution', 'agent_checkpoints']) {
			expect(await hasTable(table)).toBe(true);
		}
		await runSingleMigration(MIGRATION_NAME);
		expect(await hasTable('agent_message_queue')).toBe(true);
	});
});
