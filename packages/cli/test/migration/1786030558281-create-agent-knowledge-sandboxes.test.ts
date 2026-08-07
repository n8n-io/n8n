import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateAgentKnowledgeSandboxes1786030558281';

describe('CreateAgentKnowledgeSandboxes Migration', () => {
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

	async function insertAgent(context: TestMigrationContext): Promise<string> {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, 'team', :createdAt, :updatedAt)`,
			{
				id: projectId,
				name: `Project ${projectId}`,
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')}
			 ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, '[]', '{}', '{}', :createdAt, :updatedAt)`,
			{
				id: agentId,
				name: `Agent ${agentId}`,
				projectId,
				createdAt: now,
				updatedAt: now,
			},
		);
		return agentId;
	}

	async function insertSandbox(
		context: TestMigrationContext,
		agentId: string,
		provider: string,
		sandboxId: string,
	): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_knowledge_sandboxes')}
			 ("agentId", "provider", "sandboxId")
			 VALUES (:agentId, :provider, :sandboxId)`,
			{ agentId, provider, sandboxId },
		);
	}

	it('enforces provider-scoped uniqueness, cascades agent deletion, and reapplies after down', async () => {
		let context = createTestMigrationContext(dataSource);
		const agentId = await insertAgent(context);

		await insertSandbox(context, agentId, 'daytona', 'daytona-sandbox');
		await insertSandbox(context, agentId, 'n8n-sandbox', 'n8n-sandbox');
		await expect(insertSandbox(context, agentId, 'daytona', 'duplicate-daytona')).rejects.toThrow();
		await expect(insertSandbox(context, agentId, 'unknown', 'invalid-provider')).rejects.toThrow();

		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agents')} WHERE "id" = :agentId`,
			{ agentId },
		);
		expect(
			await context.runQuery(
				`SELECT * FROM ${context.escape.tableName('agent_knowledge_sandboxes')}`,
			),
		).toEqual([]);
		await context.queryRunner.release();

		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);
		expect(
			await context.queryRunner.hasTable(`${context.tablePrefix}agent_knowledge_sandboxes`),
		).toBe(false);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		expect(
			await context.queryRunner.hasTable(`${context.tablePrefix}agent_knowledge_sandboxes`),
		).toBe(true);
		await context.queryRunner.release();
	});
});
