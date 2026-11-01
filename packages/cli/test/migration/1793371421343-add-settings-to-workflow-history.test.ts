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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddSettingsToWorkflowHistory1793371421343';

describe('AddSettingsToWorkflowHistory Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	const workflowId = randomUUID().slice(0, 16);
	const versionId = randomUUID();

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await context.runQuery(
			`INSERT INTO ${table('workflow_entity')} (id, name, nodes, connections, settings, active, ${column('versionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:workflowId, 'workflow', '[]', '{}', :settings, false, :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId, settings: JSON.stringify({ engineType: 'v2' }) },
		);
		await context.runQuery(
			`INSERT INTO ${table('workflow_history')} (${column('versionId')}, ${column('workflowId')}, nodes, connections, authors, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:versionId, :workflowId, '[]', '{}', 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ versionId, workflowId },
		);
		// References the version with a foreign key. On SQLite, a table recreate in
		// `down` (the dropColumns DSL) fails on it, because foreign keys stay on there.
		await context.runQuery(
			`INSERT INTO ${table('workflow_published_version')} (${column('workflowId')}, ${column('publishedVersionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:workflowId, :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	beforeEach(() => {
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function settingsOfVersion(): Promise<unknown> {
		const [row] = await context.runQuery<Array<{ settings: unknown }>>(
			`SELECT settings FROM ${table('workflow_history')} WHERE ${column('versionId')} = :versionId`,
			{ versionId },
		);

		if (typeof row.settings === 'string') {
			try {
				return JSON.parse(row.settings);
			} catch {
				return null;
			}
		}
		return row.settings;
	}

	async function publishedVersionId(): Promise<string | undefined> {
		const [row] = await context.runQuery<Array<{ publishedVersionId: string }>>(
			`SELECT ${column('publishedVersionId')} FROM ${table('workflow_published_version')} WHERE ${column('workflowId')} = :workflowId`,
			{ workflowId },
		);
		return row?.publishedVersionId;
	}

	it('gives existing versions empty settings', async () => {
		expect(await settingsOfVersion()).toEqual({});
	});

	it('stores several version settings in one row', async () => {
		const settings = { engineType: 'v2', timezone: 'Europe/Berlin' };
		await context.runQuery(
			`UPDATE ${table('workflow_history')} SET settings = :settings WHERE ${column('versionId')} = :versionId`,
			{ settings: JSON.stringify(settings), versionId },
		);

		expect(await settingsOfVersion()).toEqual({ engineType: 'v2', timezone: 'Europe/Berlin' });
	});

	it('drops only the column on down', async () => {
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);

		await expect(settingsOfVersion()).rejects.toThrow();
		expect(await publishedVersionId()).toBe(versionId);
	});
});
