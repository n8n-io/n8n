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

const MIGRATION_NAME = 'CreateAgentChatAttachmentsTable1784819939398';

describe('CreateAgentChatAttachmentsTable Migration', () => {
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
		const agentId = randomUUID().slice(0, 36);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: agentId,
				name: `Agent ${agentId}`,
				projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
		return agentId;
	}

	async function insertAttachment(
		context: TestMigrationContext,
		overrides: { agentId?: string | null; projectId: string },
	): Promise<string> {
		const id = randomUUID().slice(0, 16);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_chat_attachments')}
			 ("id", "agentId", "projectId", "threadId", "binaryDataId", "fileName", "mimeType", "fileSizeBytes", "source", "createdAt", "updatedAt")
			 VALUES (:id, :agentId, :projectId, :threadId, :binaryDataId, :fileName, :mimeType, :fileSizeBytes, :source, :createdAt, :updatedAt)`,
			{
				id,
				agentId: overrides.agentId ?? null,
				projectId: overrides.projectId,
				threadId: 'thread-1',
				binaryDataId: 'filesystem-v2:agent-chat-attachments/x/y',
				fileName: 'photo.png',
				mimeType: 'image/png',
				fileSizeBytes: 33,
				source: 'chat',
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	describe('Up migration', () => {
		it('creates the agent_chat_attachments table', async () => {
			const context = createTestMigrationContext(dataSource);
			const rows = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName('agent_chat_attachments')}`,
			);
			expect(rows).toEqual([]);
			await context.queryRunner.release();
		});

		it('accepts rows without an agent (inline-agent scope) but requires a project', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = await insertProject(context);

			await expect(insertAttachment(context, { agentId: null, projectId })).resolves.toBeTruthy();
			await expect(
				insertAttachment(context, { agentId: null, projectId: randomUUID().slice(0, 36) }),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('cascades deletes from agents and project', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('agent_chat_attachments');

			const projectId = await insertProject(context);
			const agentId = await insertAgent(context, projectId);
			const agentScoped = await insertAttachment(context, { agentId, projectId });
			const projectScoped = await insertAttachment(context, { agentId: null, projectId });

			await context.runQuery(`DELETE FROM ${context.escape.tableName('agents')} WHERE "id" = :id`, {
				id: agentId,
			});
			let remaining = await context.runQuery<unknown[]>(`SELECT * FROM ${table} WHERE "id" = :id`, {
				id: agentScoped,
			});
			expect(remaining).toEqual([]);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`,
				{ id: projectId },
			);
			remaining = await context.runQuery<unknown[]>(`SELECT * FROM ${table} WHERE "id" = :id`, {
				id: projectScoped,
			});
			expect(remaining).toEqual([]);
			await context.queryRunner.release();
		});

		it('extends the binary_data sourceType check with agent_chat_attachment', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('binary_data');
			const now = new Date();
			const insert = async (sourceType: string) =>
				await context.runQuery(
					`INSERT INTO ${table} ("fileId", "sourceType", "sourceId", "data", "mimeType", "fileName", "fileSize", "createdAt", "updatedAt")
					 VALUES (:fileId, :sourceType, :sourceId, :data, :mimeType, :fileName, :fileSize, :createdAt, :updatedAt)`,
					{
						fileId: randomUUID(),
						sourceType,
						sourceId: 'att-1',
						data: Buffer.from([1]),
						mimeType: 'image/png',
						fileName: 'photo.png',
						fileSize: 1,
						createdAt: now,
						updatedAt: now,
					},
				);

			await expect(insert('agent_chat_attachment')).resolves.not.toThrow();
			await expect(insert('bogus_source')).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops the table, restores the check, and can be re-applied', async () => {
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			const tableName = `${context.tablePrefix}agent_chat_attachments`;
			expect(await context.queryRunner.hasTable(tableName)).toBe(false);
			await context.queryRunner.release();

			// Round-trip: up() must run cleanly again after a full revert.
			await runSingleMigration(MIGRATION_NAME);
			const context2 = createTestMigrationContext(dataSource);
			expect(await context2.queryRunner.hasTable(tableName)).toBe(true);
			await context2.queryRunner.release();
		});
	});
});
