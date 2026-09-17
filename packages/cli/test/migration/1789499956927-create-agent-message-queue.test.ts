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

	it('keeps IDs ordered, accepts cancellation, cascades agent deletion, and supports rollback', async () => {
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
			const leaseTable = escape.tableName('agent_conversation_lease');
			await runQuery(
				`INSERT INTO ${leaseTable} ("threadId", "agentId", "ownerToken", "expiresAt")
				 VALUES ('future-thread', :agentId, :ownerToken, :now)`,
				{ agentId, ownerToken: randomUUID(), now },
			);
			const leaseSchema = await queryRunner.getTable(`${tablePrefix}agent_conversation_lease`);
			expect(leaseSchema?.primaryColumns.map(({ name }) => name)).toEqual(['threadId']);
			expect(
				leaseSchema?.foreignKeys.map(({ columnNames, onDelete }) => ({ columnNames, onDelete })),
			).toEqual([{ columnNames: ['agentId'], onDelete: 'CASCADE' }]);
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
			await runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: rows[1].id });
			await runQuery(
				`INSERT INTO ${table} ("agentId", "threadId", "source", "kind", "status", "payload")
				 VALUES (:agentId, 'future-thread', 'preview', 'message', 'cancelling', '{}')`,
				{ agentId },
			);
			const [replacement] = await runQuery<Array<{ id: string | number; status: string }>>(
				`SELECT "id", "status" FROM ${table} ORDER BY "id" DESC LIMIT 1`,
			);
			expect(BigInt(replacement.id)).toBeGreaterThan(BigInt(rows[1].id));
			expect(replacement.status).toBe('cancelling');
			const executionId = randomUUID();
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId")
				 VALUES ('future-thread', :agentId, 'Agent', :projectId)`,
				{ agentId, projectId },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_execution')} ("id", "threadId", "status")
				 VALUES (:executionId, 'future-thread', 'running')`,
				{ executionId },
			);
			await runQuery(`UPDATE ${table} SET "executionId" = :executionId WHERE "id" = :id`, {
				executionId,
				id: rows[0].id,
			});
			await expect(
				runQuery(`UPDATE ${table} SET "executionId" = :executionId WHERE "id" = :id`, {
					executionId,
					id: replacement.id,
				}),
			).rejects.toThrow();
			await runQuery(
				`DELETE FROM ${escape.tableName('agent_execution')} WHERE "id" = :executionId`,
				{
					executionId,
				},
			);
			expect(await runQuery(`SELECT "executionId" FROM ${table}`)).toEqual([
				{ executionId: null },
				{ executionId: null },
			]);
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
				schema?.indices.find(({ columnNames }) => columnNames.includes('executionId')),
			).toMatchObject({ isUnique: true });
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
			expect(await runQuery(`SELECT "threadId" FROM ${leaseTable}`)).toEqual([]);
		});

		await undoLastSingleMigration();
		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}agent_message_queue`)).toBe(false);
			expect(await queryRunner.hasTable(`${tablePrefix}agent_conversation_lease`)).toBe(false);
			expect(await queryRunner.hasTable(`${tablePrefix}agents`)).toBe(true);
		});
		await runSingleMigration(MIGRATION);
		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}agent_message_queue`)).toBe(true);
			expect(await queryRunner.hasTable(`${tablePrefix}agent_conversation_lease`)).toBe(true);
		});
	});
});
