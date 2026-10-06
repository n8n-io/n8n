import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateInstanceAiChatAttachmentsTable1791212834808';

describe('CreateInstanceAiChatAttachmentsTable Migration', () => {
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

	it('creates the attachments table and cascades deletes from the thread', async () => {
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

		const attachmentId = randomUUID().slice(0, 16);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('instance_ai_chat_attachments')}
			 ("id", "threadId", "messageId", "binaryDataId", "fileName", "mimeType", "fileSizeBytes", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, :messageId, :binaryDataId, :fileName, :mimeType, :fileSizeBytes, :createdAt, :updatedAt)`,
			{
				id: attachmentId,
				threadId,
				messageId: 'msg-1',
				binaryDataId: 'filesystem-v2:instance-ai/x',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
				createdAt: now,
				updatedAt: now,
			},
		);

		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('instance_ai_threads')} WHERE "id" = :id`,
			{ id: threadId },
		);
		const remaining = await context.runQuery<unknown[]>(
			`SELECT * FROM ${context.escape.tableName('instance_ai_chat_attachments')} WHERE "id" = :id`,
			{ id: attachmentId },
		);
		expect(remaining).toEqual([]);
		await context.queryRunner.release();
	});

	it('extends the binary_data sourceType check with instance_ai_chat_attachment', async () => {
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

		await expect(insert('instance_ai_chat_attachment')).resolves.not.toThrow();
		await expect(insert('bogus_source')).rejects.toThrow();
		await context.queryRunner.release();
	});
});
