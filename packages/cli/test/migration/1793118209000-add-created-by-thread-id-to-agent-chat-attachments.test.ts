import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddCreatedByThreadIdToAgentChatAttachments1793118209000';

describe('AddCreatedByThreadIdToAgentChatAttachments Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('sets createdByThreadId of existing files to their thread', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		const attachmentId = randomUUID().slice(0, 16);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{ id: projectId, name: 'Project', type: 'team', createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_chat_attachments')}
			 ("id", "projectId", "threadId", "binaryDataId", "fileName", "mimeType", "fileSizeBytes", "source", "createdAt", "updatedAt")
			 VALUES (:id, :projectId, :threadId, :binaryDataId, :fileName, :mimeType, :fileSizeBytes, :source, :createdAt, :updatedAt)`,
			{
				id: attachmentId,
				projectId,
				threadId: 'thread-1',
				binaryDataId: 'filesystem-v2:x',
				fileName: 'photo.png',
				mimeType: 'image/png',
				fileSizeBytes: 1,
				source: 'chat',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		const after = createTestMigrationContext(dataSource);
		const rows = await after.runQuery<Array<{ createdByThreadId: string }>>(
			`SELECT ${after.escape.columnName('createdByThreadId')} AS "createdByThreadId"
			 FROM ${after.escape.tableName('agent_chat_attachments')} WHERE "id" = :id`,
			{ id: attachmentId },
		);
		expect(rows).toEqual([{ createdByThreadId: 'thread-1' }]);
		await after.queryRunner.release();
	});
});
