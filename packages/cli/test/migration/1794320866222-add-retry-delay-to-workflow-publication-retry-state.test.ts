import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddRetryDelayToWorkflowPublicationRetryState1794320866222';

const SCHEDULED = 60;
const PERMANENT = null;

type TriggerRow = { status: 'activated' | 'failed'; triggerKind: 'in-memory' | 'persisted' };

type Fixture = {
	workflowId: string;
	noteTarget: 'active' | 'other' | 'none';
	rows: TriggerRow[];
};

const FIXTURES: Fixture[] = [
	{
		workflowId: 'wf-failed-in-memory',
		noteTarget: 'active',
		rows: [{ status: 'failed', triggerKind: 'in-memory' }],
	},
	{
		workflowId: 'wf-failed-webhook',
		noteTarget: 'active',
		rows: [{ status: 'failed', triggerKind: 'persisted' }],
	},
	{ workflowId: 'wf-failed-before-reporting', noteTarget: 'active', rows: [] },
	{
		workflowId: 'wf-partial',
		noteTarget: 'none',
		rows: [
			{ status: 'activated', triggerKind: 'in-memory' },
			{ status: 'failed', triggerKind: 'in-memory' },
		],
	},
	{
		workflowId: 'wf-other-version',
		noteTarget: 'other',
		rows: [{ status: 'failed', triggerKind: 'in-memory' }],
	},
];

describe('AddRetryDelayToWorkflowPublicationRetryState Migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertFixture(context: TestMigrationContext, fixture: Fixture): Promise<void> {
		const { workflowId } = fixture;
		const versionId = `${workflowId}-v1`;
		const table = (name: string) => context.escape.tableName(name);

		await context.runQuery(
			`INSERT INTO ${table('workflow_entity')}
			   ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt")
			 VALUES (:workflowId, :workflowId, true, '[]', '{}', :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
		await context.runQuery(
			`INSERT INTO ${table('workflow_history')}
			   ("versionId", "workflowId", "authors", "nodes", "connections", "createdAt", "updatedAt")
			 VALUES (:versionId, :workflowId, 'n8n', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
		await context.runQuery(
			`UPDATE ${table('workflow_entity')} SET "activeVersionId" = :versionId WHERE "id" = :workflowId`,
			{ workflowId, versionId },
		);

		for (const [index, row] of fixture.rows.entries()) {
			await context.runQuery(
				`INSERT INTO ${table('workflow_publication_trigger_status')}
				   ("workflowId", "nodeId", "versionId", "status", "triggerKind", "createdAt", "updatedAt")
				 VALUES (:workflowId, :nodeId, :versionId, :status, :triggerKind, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ workflowId, nodeId: `node-${index}`, versionId, ...row },
			);
		}

		if (fixture.noteTarget !== 'none') {
			await context.runQuery(
				`INSERT INTO ${table('workflow_publication_retry_state')}
				   ("workflowId", "targetVersionId", "createdAt", "updatedAt")
				 VALUES (:workflowId, :targetVersionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{
					workflowId,
					targetVersionId: fixture.noteTarget === 'active' ? versionId : `${workflowId}-v0`,
				},
			);
		}
	}

	async function readRetryDelays(): Promise<Record<string, number | null>> {
		return await withContext(async (context) => {
			const rows = await context.runQuery<
				Array<{ workflowId: string; retryDelaySeconds: number | null }>
			>(
				`SELECT "workflowId", "retryDelaySeconds" FROM ${context.escape.tableName('workflow_publication_retry_state')}`,
			);
			return Object.fromEntries(rows.map((row) => [row.workflowId, row.retryDelaySeconds]));
		});
	}

	async function readNoteWorkflowIds(): Promise<string[]> {
		return await withContext(async (context) => {
			const rows = await context.runQuery<Array<{ workflowId: string }>>(
				`SELECT "workflowId" FROM ${context.escape.tableName('workflow_publication_retry_state')}`,
			);
			return rows.map((row) => row.workflowId).sort();
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		for (const fixture of FIXTURES) await withContext(async (c) => await insertFixture(c, fixture));
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('schedules one retry for every note at the active version and every partial workflow', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await readRetryDelays()).toEqual({
			'wf-failed-in-memory': SCHEDULED,
			'wf-failed-webhook': SCHEDULED,
			'wf-failed-before-reporting': SCHEDULED,
			'wf-partial': SCHEDULED,
			'wf-other-version': PERMANENT,
		});
	});

	it('rolls back to the notes the old code would hold', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();

		expect(await readNoteWorkflowIds()).toEqual([
			'wf-failed-before-reporting',
			'wf-failed-in-memory',
			'wf-failed-webhook',
			'wf-other-version',
		]);
	});
});
