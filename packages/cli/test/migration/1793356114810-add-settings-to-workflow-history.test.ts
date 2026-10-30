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

const MIGRATION_NAME = 'AddSettingsToWorkflowHistory1793356114810';

type SeededWorkflow = {
	id: string;
	draft: string;
	active: string;
	published: string;
	older: string;
};

describe('AddSettingsToWorkflowHistory Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let isSqlite: boolean;

	const workflows: Record<string, SeededWorkflow> = {};

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		isSqlite = context.isSqlite;
		workflows.v2 = await seedWorkflow(JSON.stringify({ engineType: 'v2', timezone: 'UTC' }));
		workflows.v1 = await seedWorkflow(JSON.stringify({ engineType: 'v1' }));
		workflows.noEngine = await seedWorkflow(JSON.stringify({ timezone: 'UTC' }));
		workflows.nullSettings = await seedWorkflow(null);
		if (isSqlite) workflows.malformed = await seedWorkflow('{not json');
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

	async function insertVersion(workflowId: string, versionId = randomUUID()) {
		await context.runQuery(
			`INSERT INTO ${table('workflow_history')} (${column('versionId')}, ${column('workflowId')}, nodes, connections, authors, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:versionId, :workflowId, '[]', '{}', 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ versionId, workflowId },
		);
		return versionId;
	}

	/** Seeds a workflow whose draft, active, published and one older version are all different rows. */
	async function seedWorkflow(settings: string | null): Promise<SeededWorkflow> {
		const id = randomUUID().slice(0, 16);
		const draft = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table('workflow_entity')} (id, name, nodes, connections, settings, active, ${column('versionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:id, :name, '[]', '{}', :settings, :active, :draft, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, name: `workflow ${id}`, settings, active: true, draft },
		);

		const older = await insertVersion(id);
		const published = await insertVersion(id);
		const active = await insertVersion(id);
		await insertVersion(id, draft);

		await context.runQuery(
			`UPDATE ${table('workflow_entity')} SET ${column('activeVersionId')} = :active WHERE id = :id`,
			{ active, id },
		);
		await context.runQuery(
			`INSERT INTO ${table('workflow_published_version')} (${column('workflowId')}, ${column('publishedVersionId')}, ${column('createdAt')}, ${column('updatedAt')})
			 VALUES (:id, :published, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, published },
		);

		return { id, draft, active, published, older };
	}

	async function settingsOf(versionId: string): Promise<unknown> {
		const [row] = await context.runQuery<Array<{ settings: unknown }>>(
			`SELECT settings FROM ${table('workflow_history')} WHERE ${column('versionId')} = :versionId`,
			{ versionId },
		);
		return typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
	}

	it.each(['draft', 'active', 'published'] as const)(
		'copies the engine to the %s version',
		async (version) => {
			expect(await settingsOf(workflows.v2[version])).toEqual({ engineType: 'v2' });
			expect(await settingsOf(workflows.v1[version])).toEqual({ engineType: 'v1' });
		},
	);

	it('leaves older versions null', async () => {
		expect(await settingsOf(workflows.v2.older)).toBeNull();
	});

	it('leaves versions of workflows without an engine null', async () => {
		for (const workflow of [workflows.noEngine, workflows.nullSettings]) {
			for (const versionId of [workflow.draft, workflow.active, workflow.published]) {
				expect(await settingsOf(versionId)).toBeNull();
			}
		}
	});

	it('skips workflows with malformed settings on SQLite', async () => {
		if (!isSqlite) return;
		expect(await settingsOf(workflows.malformed.draft)).toBeNull();
	});

	it('drops the column on down', async () => {
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);

		await expect(settingsOf(workflows.v2.draft)).rejects.toThrow();
	});
});
