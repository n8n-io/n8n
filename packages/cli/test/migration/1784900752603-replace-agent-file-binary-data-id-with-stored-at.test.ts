import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'ReplaceAgentFileBinaryDataIdWithStoredAt1784900752603';

async function columnNames(context: TestMigrationContext, table: string): Promise<string[]> {
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string }>>(
			`PRAGMA table_info(${context.escape.tableName(table)})`,
		);
		return rows.map((row) => row.name);
	}
	const fullName = `${context.tablePrefix}${table}`;
	const rows = await context.runQuery<Array<{ column_name: string }>>(
		`SELECT column_name FROM information_schema.columns WHERE table_name = :name`,
		{ name: fullName },
	);
	return rows.map((row) => row.column_name);
}

describe('ReplaceAgentFileBinaryDataIdWithStoredAt Migration', () => {
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
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertProject(context: TestMigrationContext, id: string): Promise<void> {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt") VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Test Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: { id: string; projectId: string },
	): Promise<void> {
		const table = context.escape.tableName('agents');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt") VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: 'Test Agent',
				projectId: data.projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	it('deletes existing knowledge files and replaces binaryDataId with storedAt', async () => {
		const seedContext = createTestMigrationContext(dataSource);
		try {
			await insertProject(seedContext, 'project-1');
			await insertAgent(seedContext, { id: 'agent-1', projectId: 'project-1' });

			const agentFiles = seedContext.escape.tableName('agent_files');
			const now = new Date();
			await seedContext.runQuery(
				`INSERT INTO ${agentFiles} ("id", "agentId", "binaryDataId", "fileName", "mimeType", "fileSizeBytes", "createdAt", "updatedAt") VALUES (:id, :agentId, :binaryDataId, :fileName, :mimeType, :fileSizeBytes, :createdAt, :updatedAt)`,
				{
					id: 'file-1',
					agentId: 'agent-1',
					binaryDataId: 'filesystem-v2:agents/agent-1/knowledge-files/file-1/binary_data/uuid',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 11,
					createdAt: now,
					updatedAt: now,
				},
			);

			const binaryData = seedContext.escape.tableName('binary_data');
			await seedContext.runQuery(
				`INSERT INTO ${binaryData} ("fileId", "sourceType", "sourceId", "data", "mimeType", "fileName", "fileSize", "createdAt", "updatedAt") VALUES (:fileId, :sourceType, :sourceId, :data, :mimeType, :fileName, :fileSize, :createdAt, :updatedAt)`,
				{
					fileId: '11111111-1111-1111-1111-111111111111',
					sourceType: 'agent_file',
					sourceId: 'file-1',
					data: Buffer.from('notes'),
					mimeType: 'text/plain',
					fileName: 'notes.txt',
					fileSize: 5,
					createdAt: now,
					updatedAt: now,
				},
			);
		} finally {
			await seedContext.queryRunner.release();
		}

		await runSingleMigration(MIGRATION_NAME);

		const assertContext = createTestMigrationContext(dataSource);
		try {
			const agentFiles = assertContext.escape.tableName('agent_files');
			const binaryData = assertContext.escape.tableName('binary_data');

			const remainingFiles = await assertContext.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${agentFiles}`,
			);
			expect(remainingFiles).toEqual([]);

			const remainingBinary = await assertContext.runQuery<Array<{ fileId: string }>>(
				`SELECT "fileId" FROM ${binaryData} WHERE "sourceType" = 'agent_file'`,
			);
			expect(remainingBinary).toEqual([]);

			const columns = await columnNames(assertContext, 'agent_files');
			expect(columns).toContain('storedAt');
			expect(columns).not.toContain('binaryDataId');
		} finally {
			await assertContext.queryRunner.release();
		}
	});
});
