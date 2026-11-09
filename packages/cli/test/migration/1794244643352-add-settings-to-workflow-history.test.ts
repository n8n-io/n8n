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
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddSettingsToWorkflowHistory1794244643352';

const newWorkflowId = () => randomUUID().slice(0, 16);

describe('AddSettingsToWorkflowHistory Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	// A runs on v2. Its draft is newer than its published version. Its active
	// version differs from its published mapping, so each source is checked alone.
	const v2Workflow = {
		id: newWorkflowId(),
		oldVersion: randomUUID(),
		active: randomUUID(),
		published: randomUUID(),
		draft: randomUUID(),
	};
	// B has no engine. One version is both draft and published.
	const noEngineWorkflow = { id: newWorkflowId(), published: randomUUID() };
	// C has settings that are not valid JSON. Only SQLite can store them.
	const malformedWorkflow = { id: newWorkflowId(), published: randomUUID() };

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function insertWorkflow(id: string, settings: string, draftVersionId: string) {
		await context.runQuery(
			`INSERT INTO ${table('workflow_entity')} (id, name, nodes, connections, settings, active, ${column('versionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:id, :id, '[]', '{}', :settings, false, :draftVersionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, settings, draftVersionId },
		);
	}

	async function insertVersion(workflowId: string, versionId: string) {
		await context.runQuery(
			`INSERT INTO ${table('workflow_history')} (${column('versionId')}, ${column('workflowId')}, nodes, connections, authors, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:versionId, :workflowId, '[]', '{}', 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ versionId, workflowId },
		);
	}

	async function publish(workflowId: string, versionId: string, activeVersionId = versionId) {
		await context.runQuery(
			`UPDATE ${table('workflow_entity')} SET active = true, ${column('activeVersionId')} = :activeVersionId WHERE id = :workflowId`,
			{ workflowId, activeVersionId },
		);
		await context.runQuery(
			`INSERT INTO ${table('workflow_published_version')} (${column('workflowId')}, ${column('publishedVersionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:workflowId, :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
	}

	async function settingsOf(versionId: string): Promise<unknown> {
		const [row] = await context.runQuery<Array<{ settings: unknown }>>(
			`SELECT settings FROM ${table('workflow_history')} WHERE ${column('versionId')} = :versionId`,
			{ versionId },
		);

		return typeof row.settings === 'string' ? jsonParse<unknown>(row.settings) : row.settings;
	}

	async function publishedVersionCount(): Promise<number> {
		const [row] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table('workflow_published_version')}`,
		);
		return Number(row.count);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);

		await insertWorkflow(v2Workflow.id, JSON.stringify({ engineType: 'v2' }), v2Workflow.draft);
		await insertVersion(v2Workflow.id, v2Workflow.oldVersion);
		await insertVersion(v2Workflow.id, v2Workflow.active);
		await insertVersion(v2Workflow.id, v2Workflow.published);
		await insertVersion(v2Workflow.id, v2Workflow.draft);
		await publish(v2Workflow.id, v2Workflow.published, v2Workflow.active);

		await insertWorkflow(
			noEngineWorkflow.id,
			JSON.stringify({ timezone: 'Europe/Berlin' }),
			noEngineWorkflow.published,
		);
		await insertVersion(noEngineWorkflow.id, noEngineWorkflow.published);
		await publish(noEngineWorkflow.id, noEngineWorkflow.published);

		if (context.isSqlite) {
			await insertWorkflow(malformedWorkflow.id, '{not json', malformedWorkflow.published);
			await insertVersion(malformedWorkflow.id, malformedWorkflow.published);
			await publish(malformedWorkflow.id, malformedWorkflow.published);
		}

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

	it('pins v2 on the active, published and draft versions of a v2 workflow', async () => {
		expect(await settingsOf(v2Workflow.active)).toEqual({ engineType: 'v2' });
		expect(await settingsOf(v2Workflow.published)).toEqual({ engineType: 'v2' });
		expect(await settingsOf(v2Workflow.draft)).toEqual({ engineType: 'v2' });
	});

	it('pins v1 on the published version of a workflow without an engine', async () => {
		expect(await settingsOf(noEngineWorkflow.published)).toEqual({ engineType: 'v1' });
	});

	it('leaves versions that are not draft or published empty', async () => {
		expect(await settingsOf(v2Workflow.oldVersion)).toEqual({});
	});

	it('pins v1 when workflow settings are malformed', async () => {
		if (!context.isSqlite) return;

		expect(await settingsOf(malformedWorkflow.published)).toEqual({ engineType: 'v1' });
	});

	it('drops only the column on down', async () => {
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);

		await expect(settingsOf(v2Workflow.published)).rejects.toThrow();
		expect(await publishedVersionCount()).toBe(context.isSqlite ? 3 : 2);
	});
});
