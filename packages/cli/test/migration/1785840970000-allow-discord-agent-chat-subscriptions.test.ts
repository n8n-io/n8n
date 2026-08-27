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

const MIGRATION_NAME = 'AllowDiscordAgentChatSubscriptions1785840970000';

describe('AllowDiscordAgentChatSubscriptions Migration', () => {
	let dataSource: DataSource;
	let agentId: string;

	async function insertProject(context: TestMigrationContext): Promise<string> {
		const projectId = randomUUID().slice(0, 36);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{ id: projectId, name: `Project ${projectId}`, type: 'team', createdAt: now, updatedAt: now },
		);
		return projectId;
	}

	async function insertAgent(context: TestMigrationContext, projectId: string): Promise<string> {
		const id = randomUUID().slice(0, 36);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id,
				name: `Agent ${id}`,
				projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertSubscription(
		context: TestMigrationContext,
		integrationType: string,
	): Promise<void> {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_chat_subscriptions')}
			 ("agentId", "integrationType", "credentialId", "threadId", "createdAt", "updatedAt")
			 VALUES (:agentId, :integrationType, :credentialId, :threadId, :createdAt, :updatedAt)`,
			{
				agentId,
				integrationType,
				credentialId: 'cred-1',
				threadId: `thread-${randomUUID()}`,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		let context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		const projectId = await insertProject(context);
		agentId = await insertAgent(context, projectId);
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('rejects a discord subscription before the migration and accepts one after', async () => {
		let context = createTestMigrationContext(dataSource);
		try {
			await expect(insertSubscription(context, 'discord')).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		try {
			await expect(insertSubscription(context, 'discord')).resolves.not.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('keeps accepting the pre-existing platforms and still rejects an unknown one', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(insertSubscription(context, 'telegram')).resolves.not.toThrow();
			await expect(insertSubscription(context, 'slack')).resolves.not.toThrow();
			await expect(insertSubscription(context, 'linear')).resolves.not.toThrow();
			await expect(insertSubscription(context, 'myspace')).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('removes Discord subscriptions, preserves the others, and can be reapplied', async () => {
		await undoLastSingleMigration();

		let context = createTestMigrationContext(dataSource);
		try {
			const rows = await context.runQuery<Array<{ integrationType: string }>>(
				`SELECT ${context.escape.columnName('integrationType')} FROM ${context.escape.tableName('agent_chat_subscriptions')}`,
			);
			const integrationTypes = rows.map(({ integrationType }) => integrationType);

			expect(integrationTypes).toEqual(expect.arrayContaining(['telegram', 'slack', 'linear']));
			expect(integrationTypes).not.toContain('discord');
			await expect(insertSubscription(context, 'discord')).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		try {
			await expect(insertSubscription(context, 'discord')).resolves.not.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});
});
