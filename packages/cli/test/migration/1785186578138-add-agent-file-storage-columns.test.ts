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

const MIGRATION_NAME = 'AddAgentFileStorageColumns1785186578138';

const FS_KEY =
	'agents/agent-1/knowledge-files/file-fs/binary_data/11111111-1111-1111-1111-111111111111';
const LEGACY_FS_KEY =
	'agents/agent-1/knowledge-files/file-fs-v1/binary_data/55555555-5555-5555-5555-555555555555';
const S3_KEY =
	'agents/agent-1/knowledge-files/file-s3/binary_data/22222222-2222-2222-2222-222222222222';
const DB_FILE_ID = '33333333-3333-3333-3333-333333333333';
const EXECUTION_FILE_ID = '44444444-4444-4444-4444-444444444444';
const NEW_ROW_KEY = 'agents/agent-1/knowledge-files/file-new/content';

type ColumnInfo = { name: string; nullable: boolean };

async function columnInfo(context: TestMigrationContext, table: string): Promise<ColumnInfo[]> {
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string; notnull: number }>>(
			`PRAGMA table_info(${context.escape.tableName(table)})`,
		);
		return rows.map((row) => ({ name: row.name, nullable: Number(row.notnull) === 0 }));
	}
	const rows = await context.runQuery<Array<{ column_name: string; is_nullable: string }>>(
		'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = :name',
		{ name: `${context.tablePrefix}${table}` },
	);
	return rows.map((row) => ({ name: row.column_name, nullable: row.is_nullable === 'YES' }));
}

describe('AddAgentFileStorageColumns Migration', () => {
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

	async function insertAgentFile(
		context: TestMigrationContext,
		data: { id: string; binaryDataId: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_files');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "agentId", "binaryDataId", "fileName", "mimeType", "fileSizeBytes", "createdAt", "updatedAt") VALUES (:id, :agentId, :binaryDataId, :fileName, :mimeType, :fileSizeBytes, :createdAt, :updatedAt)`,
			{
				id: data.id,
				agentId: 'agent-1',
				binaryDataId: data.binaryDataId,
				fileName: `${data.id}.txt`,
				mimeType: 'text/plain',
				fileSizeBytes: 11,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	/** Inserts the way the post-migration code does: storage columns, no `binaryDataId`. */
	async function insertMigratedAgentFile(
		context: TestMigrationContext,
		data: { id: string; storedAt: string; storageKey: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_files');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "agentId", "storedAt", "storageKey", "fileName", "mimeType", "fileSizeBytes", "createdAt", "updatedAt") VALUES (:id, :agentId, :storedAt, :storageKey, :fileName, :mimeType, :fileSizeBytes, :createdAt, :updatedAt)`,
			{
				id: data.id,
				agentId: 'agent-1',
				storedAt: data.storedAt,
				storageKey: data.storageKey,
				fileName: `${data.id}.txt`,
				mimeType: 'text/plain',
				fileSizeBytes: 11,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertBinaryData(
		context: TestMigrationContext,
		data: { fileId: string; sourceType: string; sourceId: string },
	): Promise<void> {
		const table = context.escape.tableName('binary_data');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("fileId", "sourceType", "sourceId", "data", "mimeType", "fileName", "fileSize", "createdAt", "updatedAt") VALUES (:fileId, :sourceType, :sourceId, :data, :mimeType, :fileName, :fileSize, :createdAt, :updatedAt)`,
			{
				fileId: data.fileId,
				sourceType: data.sourceType,
				sourceId: data.sourceId,
				data: Buffer.from('bytes'),
				mimeType: 'text/plain',
				fileName: 'notes.txt',
				fileSize: 5,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	it('backfills storedAt plus storageKey from every binaryDataId prefix', async () => {
		const seedContext = createTestMigrationContext(dataSource);
		try {
			await insertProject(seedContext, 'project-1');
			await insertAgent(seedContext, { id: 'agent-1', projectId: 'project-1' });

			await insertAgentFile(seedContext, {
				id: 'file-fs',
				binaryDataId: `filesystem-v2:${FS_KEY}`,
			});
			await insertAgentFile(seedContext, {
				id: 'file-fs-v1',
				binaryDataId: `filesystem:${LEGACY_FS_KEY}`,
			});
			await insertAgentFile(seedContext, { id: 'file-s3', binaryDataId: `s3:${S3_KEY}` });
			await insertAgentFile(seedContext, { id: 'file-db', binaryDataId: `database:${DB_FILE_ID}` });
			await insertAgentFile(seedContext, { id: 'file-bad', binaryDataId: 'garbage' });

			await insertBinaryData(seedContext, {
				fileId: DB_FILE_ID,
				sourceType: 'agent_file',
				sourceId: 'file-db',
			});
			await insertBinaryData(seedContext, {
				fileId: EXECUTION_FILE_ID,
				sourceType: 'execution',
				sourceId: 'exec-1',
			});
		} finally {
			await seedContext.queryRunner.release();
		}

		await runSingleMigration(MIGRATION_NAME);

		const context = createTestMigrationContext(dataSource);
		try {
			const agentFiles = context.escape.tableName('agent_files');
			const binaryData = context.escape.tableName('binary_data');

			const files = await context.runQuery<
				Array<{ id: string; storedAt: string; storageKey: string }>
			>(`SELECT "id", "storedAt", "storageKey" FROM ${agentFiles} ORDER BY "id"`);
			// `file-bad` carries an unrecognized reference: kept whole rather than dropped.
			expect(files).toEqual([
				{ id: 'file-bad', storedAt: 'fs', storageKey: 'garbage' },
				{ id: 'file-db', storedAt: 'db', storageKey: DB_FILE_ID },
				{ id: 'file-fs', storedAt: 'fs', storageKey: FS_KEY },
				{ id: 'file-fs-v1', storedAt: 'fs', storageKey: LEGACY_FS_KEY },
				{ id: 'file-s3', storedAt: 's3', storageKey: S3_KEY },
			]);

			// The database-mode file keeps its bytes, addressed by storageKey.
			const binaryRows = await context.runQuery<Array<{ fileId: string }>>(
				`SELECT "fileId" FROM ${binaryData} ORDER BY "fileId"`,
			);
			expect(binaryRows).toEqual([{ fileId: DB_FILE_ID }, { fileId: EXECUTION_FILE_ID }]);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('leaves binaryDataId in place as nullable so the previous release keeps reading it', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const agentFiles = context.escape.tableName('agent_files');

			expect(await columnInfo(context, 'agent_files')).toContainEqual({
				name: 'binaryDataId',
				nullable: true,
			});

			const files = await context.runQuery<Array<{ id: string; binaryDataId: string }>>(
				`SELECT "id", "binaryDataId" FROM ${agentFiles} ORDER BY "id"`,
			);
			expect(files).toEqual([
				{ id: 'file-bad', binaryDataId: 'garbage' },
				{ id: 'file-db', binaryDataId: `database:${DB_FILE_ID}` },
				{ id: 'file-fs', binaryDataId: `filesystem-v2:${FS_KEY}` },
				{ id: 'file-fs-v1', binaryDataId: `filesystem:${LEGACY_FS_KEY}` },
				{ id: 'file-s3', binaryDataId: `s3:${S3_KEY}` },
			]);
		} finally {
			await context.queryRunner.release();
		}
	});

	// Declared last: the revert undoes the schema the tests above assert on.
	describe('down', () => {
		it('rebuilds binaryDataId only for rows written after the migration', async () => {
			const seedContext = createTestMigrationContext(dataSource);
			try {
				await insertMigratedAgentFile(seedContext, {
					id: 'file-new',
					storedAt: 'fs',
					storageKey: NEW_ROW_KEY,
				});
			} finally {
				await seedContext.queryRunner.release();
			}

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			try {
				const agentFiles = context.escape.tableName('agent_files');

				const files = await context.runQuery<Array<{ id: string; binaryDataId: string }>>(
					`SELECT "id", "binaryDataId" FROM ${agentFiles} ORDER BY "id"`,
				);
				// Pre-existing rows kept their original opaque reference — including the
				// unrecognized one — so the revert is lossless for them.
				expect(files).toEqual([
					{ id: 'file-bad', binaryDataId: 'garbage' },
					{ id: 'file-db', binaryDataId: `database:${DB_FILE_ID}` },
					{ id: 'file-fs', binaryDataId: `filesystem-v2:${FS_KEY}` },
					{ id: 'file-fs-v1', binaryDataId: `filesystem:${LEGACY_FS_KEY}` },
					{ id: 'file-new', binaryDataId: `filesystem-v2:${NEW_ROW_KEY}` },
					{ id: 'file-s3', binaryDataId: `s3:${S3_KEY}` },
				]);

				const columns = (await columnInfo(context, 'agent_files')).map((column) => column.name);
				expect(columns).not.toContain('storedAt');
				expect(columns).not.toContain('storageKey');
			} finally {
				await context.queryRunner.release();
			}

			// The revert leaves a state up() applies cleanly to again.
			await runSingleMigration(MIGRATION_NAME);
		});
	});
});
