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
import { v7 as uuidv7 } from 'uuid';

const migrationName = 'CreateApps1792496430067';
const previousSourceTypes = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const isPostgres = process.env.DB_TYPE === 'postgresdb';

describe('CreateApps migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(migrationName);

		context = createTestMigrationContext(dataSource);
		for (const sourceType of previousSourceTypes) {
			await insertBinary(sourceType);
		}
		await context.queryRunner.release();

		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		if (!context.queryRunner.isReleased) await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertBinary(sourceType: string) {
		const { escape, runQuery } = context;
		await runQuery(
			`INSERT INTO ${escape.tableName('binary_data')}
			 (${['fileId', 'sourceType', 'sourceId', 'data', 'fileSize'].map(escape.columnName).join(', ')})
			 VALUES (:fileId, :sourceType, :sourceId, :data, 1)`,
			{ fileId: uuidv7(), sourceType, sourceId: 'test-source', data: Buffer.from([1]) },
		);
	}

	async function readBinaries() {
		const { escape, runQuery } = context;
		return await runQuery<Array<{ fileId: string; sourceType: string; data: Buffer }>>(
			`SELECT ${['fileId', 'sourceType', 'data'].map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('binary_data')} ORDER BY ${escape.columnName('sourceType')}`,
		);
	}

	async function insertAppWithVersion() {
		const { escape, runQuery } = context;
		const projectId = uuidv7();
		const appId = uuidv7();
		const versionId = uuidv7();
		await runQuery(
			`INSERT INTO ${escape.tableName('project')}
			 (${['id', 'name', 'type'].map(escape.columnName).join(', ')})
			 VALUES (:id, 'Test project', 'team')`,
			{ id: projectId },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('app')}
			 (${['id', 'name', 'namespace', 'projectId'].map(escape.columnName).join(', ')})
			 VALUES (:id, 'Test app', :namespace, :projectId)`,
			{ id: appId, namespace: `app-${appId}`, projectId },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('app_artifact')}
			 (${['appId', 'storedAt', 'storageKey', 'sizeBytes'].map(escape.columnName).join(', ')})
			 VALUES (:appId, 'db', :storageKey, 1)`,
			{ appId, storageKey: uuidv7() },
		);
		const [artifact] = await runQuery<Array<{ id: number }>>(
			`SELECT ${escape.columnName('id')} FROM ${escape.tableName('app_artifact')}`,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('app_version')}
			 (${['id', 'appId', 'sourceArtifactId'].map(escape.columnName).join(', ')})
			 VALUES (:id, :appId, :sourceArtifactId)`,
			{ id: versionId, appId, sourceArtifactId: artifact.id },
		);
		await runQuery(
			`UPDATE ${escape.tableName('app')}
			 SET ${escape.columnName('draftVersionId')} = :versionId,
			     ${escape.columnName('publishedVersionId')} = :versionId
			 WHERE ${escape.columnName('id')} = :appId`,
			{ versionId, appId },
		);
		return { projectId, appId, versionId, artifactId: artifact.id };
	}

	it('preserves existing binaries and checks new and updated source types', async () => {
		const existing = await readBinaries();
		expect(existing.map((row) => row.sourceType)).toEqual([...previousSourceTypes].sort());
		for (const row of existing) expect(Buffer.from(row.data)).toEqual(Buffer.from([1]));

		await insertBinary('app_artifact');
		await expect(insertBinary('unknown_source')).rejects.toThrow();
		const { escape, runQuery } = context;
		await expect(
			runQuery(
				`UPDATE ${escape.tableName('binary_data')}
				 SET ${escape.columnName('sourceType')} = 'unknown_source'
				 WHERE ${escape.columnName('sourceType')} = 'app_artifact'`,
			),
		).rejects.toThrow();
		expect(await readBinaries()).toHaveLength(previousSourceTypes.length + 1);
	});

	it('sets app defaults and clears version pointers when the version is deleted', async () => {
		const { appId, versionId, artifactId } = await insertAppWithVersion();
		const { escape, runQuery } = context;
		const [app] = await runQuery<Array<{ visibility: string }>>(
			`SELECT ${escape.columnName('visibility')} FROM ${escape.tableName('app')}`,
		);
		expect(app.visibility).toBe('project');
		const [version] = await runQuery<Array<{ buildStatus: string; buildAttempts: number }>>(
			`SELECT ${['buildStatus', 'buildAttempts'].map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('app_version')}`,
		);
		expect(version).toEqual({ buildStatus: 'queued', buildAttempts: 0 });

		await expect(
			runQuery(
				`DELETE FROM ${escape.tableName('app_artifact')} WHERE ${escape.columnName('id')} = :id`,
				{ id: artifactId },
			),
		).rejects.toThrow();
		await runQuery(
			`DELETE FROM ${escape.tableName('app_version')} WHERE ${escape.columnName('id')} = :id`,
			{ id: versionId },
		);
		const [pointers] = await runQuery<
			Array<{ draftVersionId: string | null; publishedVersionId: string | null }>
		>(
			`SELECT ${['draftVersionId', 'publishedVersionId'].map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('app')} WHERE ${escape.columnName('id')} = :id`,
			{ id: appId },
		);
		expect(pointers).toEqual({ draftVersionId: null, publishedVersionId: null });
	});

	it('deletes apps and versions with their project and keeps artifact storage references', async () => {
		const { projectId, appId, artifactId } = await insertAppWithVersion();
		const { escape, runQuery } = context;
		await runQuery(
			`DELETE FROM ${escape.tableName('project')} WHERE ${escape.columnName('id')} = :id`,
			{ id: projectId },
		);
		for (const table of ['app', 'app_version']) {
			expect(await runQuery<unknown[]>(`SELECT * FROM ${escape.tableName(table)}`)).toEqual([]);
		}
		const artifacts = await runQuery<
			Array<{ id: number; appId: string; storedAt: string; storageKey: string }>
		>(
			`SELECT ${['id', 'appId', 'storedAt', 'storageKey'].map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('app_artifact')}`,
		);
		expect(artifacts).toEqual([
			{ id: artifactId, appId, storedAt: 'db', storageKey: expect.any(String) },
		]);
	});

	it('reverts populated app tables, removes only app binaries, and can run again', async () => {
		const existing = await readBinaries();
		await insertAppWithVersion();
		await insertBinary('app_artifact');
		await context.queryRunner.release();

		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);
		for (const table of ['app', 'app_version', 'app_artifact']) {
			expect(await context.queryRunner.hasTable(`${context.tablePrefix}${table}`)).toBe(false);
		}
		expect(await readBinaries()).toEqual(existing);
		await expect(insertBinary('app_artifact')).rejects.toThrow();
		await expect(insertBinary('unknown_source')).rejects.toThrow();
		for (const sourceType of previousSourceTypes) await insertBinary(sourceType);
		await context.queryRunner.release();

		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
		await insertAppWithVersion();
		await insertBinary('app_artifact');
	});

	it.skipIf(!isPostgres)(
		'keeps source checks unvalidated on PostgreSQL in both directions',
		async () => {
			async function expectUnvalidatedCheck() {
				const constraints = await context.runQuery<Array<{ convalidated: boolean }>>(
					`SELECT convalidated FROM pg_constraint
				 WHERE conrelid = CAST(:tableName AS regclass) AND conname = :constraintName`,
					{
						tableName: context.escape.tableName('binary_data'),
						constraintName: `CHK_${context.tablePrefix}binary_data_sourceType`,
					},
				);
				expect(constraints).toEqual([{ convalidated: false }]);
			}

			await expectUnvalidatedCheck();
			await insertBinary('app_artifact');
			await context.queryRunner.release();
			await undoLastSingleMigration();
			context = createTestMigrationContext(dataSource);
			await expectUnvalidatedCheck();
			await expect(insertBinary('app_artifact')).rejects.toThrow();
		},
	);
});
