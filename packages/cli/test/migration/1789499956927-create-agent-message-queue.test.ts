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
import { randomUUID } from 'node:crypto';

const MIGRATION = 'CreateAgentMessageQueue1789499956927';

describe('CreateAgentMessageQueue migration', () => {
	async function withContext(fn: (context: TestMigrationContext) => Promise<void>) {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION);
	});
	afterAll(async () => await Container.get(DbConnection).close());

	it('generates ordered IDs before a thread exists, cascades agent deletion, and supports rollback', async () => {
		await runSingleMigration(MIGRATION);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			const now = new Date();
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			const table = escape.tableName('agent_message_queue');
			for (const text of ['one', 'two']) {
				await runQuery(
					`INSERT INTO ${table} ("agentId", "threadId", "source", "kind", "status", "payload")
					 VALUES (:agentId, 'future-thread', 'preview', 'message', 'queued', :payload)`,
					{ agentId, payload: JSON.stringify({ message: text }) },
				);
			}
			const rows = await runQuery<Array<{ id: string | number }>>(
				`SELECT "id" FROM ${table} ORDER BY "id"`,
			);
			expect(rows).toHaveLength(2);
			expect(BigInt(rows[1].id)).toBeGreaterThan(BigInt(rows[0].id));
			const schema = await queryRunner.getTable(`${tablePrefix}agent_message_queue`);
			// The PostgreSQL driver returns index columns in name order.
			expect(schema?.indices.map(({ columnNames }) => columnNames.toSorted())).toEqual(
				expect.arrayContaining([
					['id', 'kind', 'status', 'threadId'],
					['status', 'updatedAt'],
					['agentId'],
					['executionId'],
				]),
			);
			expect(
				schema?.foreignKeys.map(({ columnNames, onDelete }) => ({ columnNames, onDelete })),
			).toEqual(
				expect.arrayContaining([
					{ columnNames: ['agentId'], onDelete: 'CASCADE' },
					{ columnNames: ['executionId'], onDelete: 'SET NULL' },
				]),
			);
			await runQuery(`DELETE FROM ${escape.tableName('agents')} WHERE "id" = :agentId`, {
				agentId,
			});
			expect(await runQuery(`SELECT "id" FROM ${table}`)).toEqual([]);
		});

		await undoLastSingleMigration();
		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}agent_message_queue`)).toBe(false);
			expect(await queryRunner.hasTable(`${tablePrefix}agents`)).toBe(true);
		});
		await runSingleMigration(MIGRATION);
		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}agent_message_queue`)).toBe(true);
		});
	});
});
