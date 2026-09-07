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

const MIGRATION_NAME = 'GeneralizeScheduledJobOwner1788359043381';

const WORKFLOW_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_WORKFLOW_ID = '22222222-2222-2222-2222-222222222222';
const NODE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

/** The published version of each seeded workflow; 36 chars, as the columns require. */
const VERSION_ID: Record<string, string> = {
	[WORKFLOW_ID]: '33333333-3333-3333-3333-333333333333',
	[OTHER_WORKFLOW_ID]: '44444444-4444-4444-4444-444444444444',
};

interface JobRow {
	name: string;
	ownerType: string | null;
	ownerId: string | null;
	ownerMemberId: string | null;
}

describe('GeneralizeScheduledJobOwner Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/** A published workflow, so a job's `workflowId` satisfies the foreign key. */
	async function insertPublishedWorkflow(context: TestMigrationContext, workflowId: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_entity')}
			   ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt")
			 VALUES ('${workflowId}', 'wf ${workflowId}', false, '[]', '{}', '${VERSION_ID[workflowId]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_history')}
			   ("versionId", "workflowId", "authors", "nodes", "connections", "createdAt", "updatedAt")
			 VALUES ('${VERSION_ID[workflowId]}', '${workflowId}', 'test', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_published_version')}
			   ("workflowId", "publishedVersionId", "createdAt", "updatedAt")
			 VALUES ('${workflowId}', '${VERSION_ID[workflowId]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function insertWorkflowJob(
		context: TestMigrationContext,
		name: string,
		workflowId: string,
		nodeId: string | null,
	) {
		const node = nodeId === null ? 'NULL' : `'${nodeId}'`;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "workflowId", "nodeId", "createdAt", "updatedAt")
			 VALUES ('${name}', 'interval', 60, 'workflow:schedule-trigger', '${workflowId}', ${node}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function insertOwnerlessJob(context: TestMigrationContext, name: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "createdAt", "updatedAt")
			 VALUES ('${name}', 'interval', 60, 'system:prune-executions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function insertTaskFor(context: TestMigrationContext, jobName: string) {
		const [job] = (await context.queryRunner.query(
			`SELECT "id" FROM ${context.escape.tableName('scheduled_job')} WHERE "name" = '${jobName}'`,
		)) as Array<{ id: number }>;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_task')}
			   ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
			 VALUES (${job.id}, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function owners(context: TestMigrationContext): Promise<Record<string, JobRow>> {
		const rows = (await context.queryRunner.query(
			`SELECT "name", "ownerType", "ownerId", "ownerMemberId" FROM ${context.escape.tableName('scheduled_job')}`,
		)) as JobRow[];
		return Object.fromEntries(rows.map((row) => [row.name, row]));
	}

	async function columnNames(context: TestMigrationContext, table: string): Promise<string[]> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(table)})`,
			)) as Array<{ name: string }>;
			return rows.map((row) => row.name);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}${table}`],
		)) as Array<{ column_name: string }>;
		return rows.map((row) => row.column_name);
	}

	async function jobIndexDefinitions(context: TestMigrationContext): Promise<string[]> {
		const table = `${context.tablePrefix}scheduled_job`;
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = '${table}'`,
			)) as Array<{ sql: string | null }>;
			return rows.map((row) => row.sql ?? '');
		}
		const rows = (await context.queryRunner.query(
			'SELECT indexdef FROM pg_indexes WHERE tablename = $1',
			[table],
		)) as Array<{ indexdef: string }>;
		return rows.map((row) => row.indexdef);
	}

	async function countRows(context: TestMigrationContext, table: string): Promise<number> {
		const [{ count }] = (await context.queryRunner.query(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ count: number | string }>;
		return Number(count);
	}

	async function taskJobNames(context: TestMigrationContext): Promise<string[]> {
		const rows = (await context.queryRunner.query(
			`SELECT "job"."name" AS "name"
			   FROM ${context.escape.tableName('scheduled_task')} "task"
			   INNER JOIN ${context.escape.tableName('scheduled_job')} "job" ON "job"."id" = "task"."jobId"`,
		)) as Array<{ name: string }>;
		return rows.map((row) => row.name).sort();
	}

	async function foreignKeyViolations(context: TestMigrationContext): Promise<unknown[]> {
		if (!context.isSqlite) {
			return [];
		}
		return (await context.queryRunner.query(
			`PRAGMA foreign_key_check(${context.escape.tableName('scheduled_task')})`,
		)) as unknown[];
	}

	/** Two workflow-owned jobs on one node, one on another workflow, and one ownerless. */
	async function seedJobsAndTasks() {
		const context = createTestMigrationContext(dataSource);
		await insertPublishedWorkflow(context, WORKFLOW_ID);
		await insertPublishedWorkflow(context, OTHER_WORKFLOW_ID);
		await insertWorkflowJob(context, 'rule_a', WORKFLOW_ID, NODE_ID);
		await insertWorkflowJob(context, 'rule_b', WORKFLOW_ID, NODE_ID);
		await insertWorkflowJob(context, 'nodeless', OTHER_WORKFLOW_ID, null);
		await insertOwnerlessJob(context, 'system:prune-executions');
		await insertTaskFor(context, 'rule_a');
		await insertTaskFor(context, 'system:prune-executions');
		await context.queryRunner.release();
	}

	describe('up', () => {
		it('backfills a workflow owner from workflowId/nodeId and a self owner from the name', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await owners(context)).toEqual({
				rule_a: {
					name: 'rule_a',
					ownerType: 'workflow',
					ownerId: WORKFLOW_ID,
					ownerMemberId: NODE_ID,
				},
				rule_b: {
					name: 'rule_b',
					ownerType: 'workflow',
					ownerId: WORKFLOW_ID,
					ownerMemberId: NODE_ID,
				},
				nodeless: {
					name: 'nodeless',
					ownerType: 'workflow',
					ownerId: OTHER_WORKFLOW_ID,
					ownerMemberId: null,
				},
				'system:prune-executions': {
					name: 'system:prune-executions',
					ownerType: 'system-task',
					ownerId: 'system:prune-executions',
					ownerMemberId: null,
				},
			});
			await context.queryRunner.release();
		});

		it('drops the old owner columns, their index and their foreign key', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			const columns = await columnNames(context, 'scheduled_job');
			expect(columns).not.toContain('workflowId');
			expect(columns).not.toContain('nodeId');
			expect(columns).toEqual(
				expect.arrayContaining(['ownerType', 'ownerId', 'ownerMemberId', 'orphanedAt']),
			);

			const definitions = await jobIndexDefinitions(context);
			expect(definitions.some((sql) => sql.includes('workflowId'))).toBe(false);
			expect(definitions.some((sql) => sql.includes('ownerType'))).toBe(true);
			// Untouched by this migration.
			expect(definitions.some((sql) => sql.includes('nextRunAt'))).toBe(true);
			expect(definitions.some((sql) => sql.includes('name'))).toBe(true);

			// The dropped cascade: unpublishing no longer removes the workflow's jobs.
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('workflow_published_version')} WHERE "workflowId" = '${WORKFLOW_ID}'`,
			);
			expect(await countRows(context, 'scheduled_job')).toBe(4);
			await context.queryRunner.release();
		});

		it('requires an owner on every new row', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "createdAt", "updatedAt")
					 VALUES ('ownerless', 'interval', 60, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).rejects.toThrow();
			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt")
					 VALUES ('owned', 'interval', 60, 'test', 'agent', 'agent-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).resolves.not.toThrow();
			await context.queryRunner.release();
		});

		it('keeps every job row, its queued occurrences and the other CHECK constraints', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await countRows(context, 'scheduled_job')).toBe(4);
			expect(await countRows(context, 'scheduled_task')).toBe(2);
			expect(await taskJobNames(context)).toEqual(['rule_a', 'system:prune-executions']);
			expect(await foreignKeyViolations(context)).toEqual([]);
			expect(await columnNames(context, 'scheduled_job')).toEqual(
				expect.arrayContaining([
					'misfirePolicy',
					'misfireGraceSeconds',
					'recurrenceUnit',
					'recurrenceSize',
				]),
			);

			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt")
					 VALUES ('bad_kind', 'nonsense', 60, 'test', 'agent', 'a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).rejects.toThrow();
			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "misfireGraceSeconds", "createdAt", "updatedAt")
					 VALUES ('bad_grace', 'interval', 60, 'test', 'agent', 'a', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('restores workflowId/nodeId, the index and the cascading foreign key', async () => {
			await seedJobsAndTasks();
			await runSingleMigration(MIGRATION_NAME);

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const columns = await columnNames(context, 'scheduled_job');
			expect(columns).toEqual(expect.arrayContaining(['workflowId', 'nodeId']));
			expect(columns).not.toContain('ownerType');
			expect(columns).not.toContain('orphanedAt');

			const rows = (await context.queryRunner.query(
				`SELECT "name", "workflowId", "nodeId" FROM ${context.escape.tableName('scheduled_job')}`,
			)) as Array<{ name: string; workflowId: string | null; nodeId: string | null }>;
			expect(Object.fromEntries(rows.map((row) => [row.name, row]))).toEqual({
				rule_a: { name: 'rule_a', workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				rule_b: { name: 'rule_b', workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				nodeless: { name: 'nodeless', workflowId: OTHER_WORKFLOW_ID, nodeId: null },
				'system:prune-executions': {
					name: 'system:prune-executions',
					workflowId: null,
					nodeId: null,
				},
			});

			expect((await jobIndexDefinitions(context)).some((sql) => sql.includes('workflowId'))).toBe(
				true,
			);
			expect(await countRows(context, 'scheduled_task')).toBe(2);
			expect(await foreignKeyViolations(context)).toEqual([]);

			// The cascade is back: unpublishing removes the workflow's jobs again.
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('workflow_published_version')} WHERE "workflowId" = '${WORKFLOW_ID}'`,
			);
			expect(await countRows(context, 'scheduled_job')).toBe(2);
			await context.queryRunner.release();
		});

		it('drops the jobs of a workflow with no published version, which the restored key rejects', async () => {
			await seedJobsAndTasks();
			await runSingleMigration(MIGRATION_NAME);

			// Only possible once the key is gone: a job outliving its published version.
			const seeded = createTestMigrationContext(dataSource);
			await seeded.runQuery(
				`DELETE FROM ${seeded.escape.tableName('workflow_published_version')} WHERE "workflowId" = '${WORKFLOW_ID}'`,
			);
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const names = (
				(await context.queryRunner.query(
					`SELECT "name" FROM ${context.escape.tableName('scheduled_job')}`,
				)) as Array<{ name: string }>
			).map((row) => row.name);
			// `rule_a`/`rule_b` pointed at the unpublished workflow; the other two stand.
			expect(names.sort()).toEqual(['nodeless', 'system:prune-executions']);
			expect(await foreignKeyViolations(context)).toEqual([]);
			await context.queryRunner.release();
		});

		it('leaves a non-workflow owner as an ownerless job rather than deleting it', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const seeded = createTestMigrationContext(dataSource);
			await seeded.runQuery(
				`INSERT INTO ${seeded.escape.tableName('scheduled_job')}
				   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt")
				 VALUES ('agent_job', 'interval', 60, 'agent:task', 'agent', 'agent-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const [row] = (await context.queryRunner.query(
				`SELECT "name", "workflowId" FROM ${context.escape.tableName('scheduled_job')} WHERE "name" = 'agent_job'`,
			)) as Array<{ name: string; workflowId: string | null }>;
			expect(row).toEqual({ name: 'agent_job', workflowId: null });
			await context.queryRunner.release();
		});
	});
});
