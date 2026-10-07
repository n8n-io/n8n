import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateSessionOutputFilesTables1791213274199';

describe('CreateSessionOutputFilesTables Migration', () => {
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

	it('creates the instance AI output table and cascades deletes from the thread', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = randomUUID().slice(0, 36);
		const threadId = randomUUID();
		const now = new Date();

		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{ id: projectId, name: `Project ${projectId}`, type: 'team', createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('instance_ai_threads')}
			 ("id", "resourceId", "projectId", "title", "createdAt", "updatedAt")
			 VALUES (:id, :resourceId, :projectId, :title, :createdAt, :updatedAt)`,
			{
				id: threadId,
				resourceId: 'user-1',
				projectId,
				title: '',
				createdAt: now,
				updatedAt: now,
			},
		);

		const fileId = randomUUID().slice(0, 16);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('instance_ai_session_output_files')}
			 ("id", "threadId", "runId", "writerId", "fileName", "mimeType", "fileSizeBytes", "binaryDataId", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, :runId, :writerId, :fileName, :mimeType, :fileSizeBytes, :binaryDataId, :createdAt, :updatedAt)`,
			{
				id: fileId,
				threadId,
				runId: 'run-1',
				writerId: 'parent',
				fileName: 'hello.md',
				mimeType: 'text/markdown',
				fileSizeBytes: 4,
				binaryDataId: 'filesystem-v2:instance-ai/x',
				createdAt: now,
				updatedAt: now,
			},
		);

		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('instance_ai_threads')} WHERE "id" = :id`,
			{ id: threadId },
		);
		const remaining = await context.runQuery<unknown[]>(
			`SELECT * FROM ${context.escape.tableName('instance_ai_session_output_files')} WHERE "id" = :id`,
			{ id: fileId },
		);
		expect(remaining).toEqual([]);
		await context.queryRunner.release();
	});

	it('extends the binary_data sourceType check with the session output types', async () => {
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
					sourceId: 'out-1',
					data: Buffer.from([1]),
					mimeType: 'text/markdown',
					fileName: 'hello.md',
					fileSize: 1,
					createdAt: now,
					updatedAt: now,
				},
			);

		await expect(insert('agent_session_output')).resolves.not.toThrow();
		await expect(insert('instance_ai_session_output')).resolves.not.toThrow();
		await expect(insert('bogus_source')).rejects.toThrow();
		await context.queryRunner.release();
	});
});
