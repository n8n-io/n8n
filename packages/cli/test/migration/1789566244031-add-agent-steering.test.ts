import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION = 'AddAgentSteering1789566244031';

describe('AddAgentSteering migration', () => {
	let dataSource: DataSource;
	let queueId: string;

	async function withContext(fn: (context: TestMigrationContext) => Promise<void>) {
		const context = createTestMigrationContext(dataSource);
		try {
			await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION);
		await withContext(async ({ escape, runQuery }) => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			const threadId = randomUUID();
			const executionId = randomUUID();
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
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId", "createdAt", "updatedAt")
				 VALUES (:threadId, :agentId, 'Agent', :projectId, :now, :now)`,
				{ threadId, agentId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_execution')} ("id", "threadId", "status", "duration", "storedAt", "createdAt", "updatedAt")
				 VALUES (:executionId, :threadId, 'running', 0, 'db', :now, :now)`,
				{ executionId, threadId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_message_queue')} ("agentId", "threadId", "source", "kind", "status", "payload")
				 VALUES (:agentId, :threadId, 'preview', 'message', 'queued', '{}')`,
				{ agentId, threadId },
			);
			const rows = await runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${escape.tableName('agent_message_queue')} WHERE "threadId" = :threadId`,
				{ threadId },
			);
			queueId = String(rows[0].id);
		});
		await runSingleMigration(MIGRATION);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('preserves legacy rows and blocks rollback while steering input exists', async () => {
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_message_queue')}
				 SET "status" = 'processing', "steeringRunId" = 'run-1', "steeringOrder" = 1
				 WHERE "id" = :queueId`,
				{ queueId },
			);
		});

		await expect(dataSource.undoLastMigration({ transaction: 'each' })).rejects.toThrow(
			'Cannot remove agent steering while steering messages exist',
		);

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_message_queue')}
				 SET "status" = 'queued', "steeringRunId" = NULL, "steeringOrder" = NULL
				 WHERE "id" = :queueId`,
				{ queueId },
			);
		});
		await dataSource.undoLastMigration({ transaction: 'each' });
		await withContext(async ({ queryRunner, tablePrefix }) => {
			const queue = await queryRunner.getTable(`${tablePrefix}agent_message_queue`);
			const execution = await queryRunner.getTable(`${tablePrefix}agent_execution`);
			expect(queue?.findColumnByName('steeringRunId')).toBeUndefined();
			expect(execution?.findColumnByName('runtimeRunId')).toBeUndefined();
		});
		await runSingleMigration(MIGRATION);
	});
});
