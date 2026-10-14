import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'ExpandNodeIdColumns1791903158491';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

const workflowId = 'wf-1';
const versionId = 'v-1';

// SQLite does not enforce varchar lengths, so the migration exists only for Postgres.
describe.skipIf(isSqlite)('ExpandNodeIdColumns migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(insertWorkflowWithVersion);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertWorkflowWithVersion(context: TestMigrationContext): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_entity')}
			   ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt")
			 VALUES (:workflowId, 'wf', false, '[]', '{}', :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_history')}
			   ("versionId", "workflowId", "authors", "nodes", "connections", "createdAt", "updatedAt")
			 VALUES (:versionId, :workflowId, 'n8n', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ workflowId, versionId },
		);
	}

	const insertInto = {
		triggerStatus: async (nodeId: string) =>
			await withContext(
				async (context) =>
					await context.runQuery(
						`INSERT INTO ${context.escape.tableName('workflow_publication_trigger_status')}
						   ("workflowId", "nodeId", "versionId", "status", "triggerKind", "createdAt", "updatedAt")
						 VALUES (:workflowId, :nodeId, :versionId, 'activated', 'persisted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
						{ workflowId, nodeId, versionId },
					),
			),
		pollerState: async (nodeId: string) =>
			await withContext(
				async (context) =>
					await context.runQuery(
						`INSERT INTO ${context.escape.tableName('poller_state')}
						   ("workflowId", "nodeId", "createdAt", "updatedAt")
						 VALUES (:workflowId, :nodeId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
						{ workflowId, nodeId },
					),
			),
		scheduledJob: async (ownerMemberId: string) =>
			await withContext(
				async (context) =>
					await context.runQuery(
						`INSERT INTO ${context.escape.tableName('scheduled_job')}
						   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "ownerMemberId", "createdAt", "updatedAt")
						 VALUES ('job', 'interval', 60, 'test', 'workflow', :workflowId, :ownerMemberId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
						{ workflowId, ownerMemberId },
					),
			),
	};

	async function insertNodeIdRows(nodeId: string): Promise<void> {
		await insertInto.triggerStatus(nodeId);
		await insertInto.pollerState(nodeId);
		await insertInto.scheduledJob(nodeId);
	}

	async function readNodeIds(): Promise<Record<string, string[]>> {
		return await withContext(async (context) => {
			const select = async (table: string, column: string) => {
				const rows: Array<{ value: string }> = await context.runQuery(
					`SELECT ${context.escape.columnName(column)} AS "value" FROM ${context.escape.tableName(table)} ORDER BY 1`,
				);
				return rows.map(({ value }) => value);
			};
			return {
				triggerStatus: await select('workflow_publication_trigger_status', 'nodeId'),
				pollerState: await select('poller_state', 'nodeId'),
				scheduledJob: await select('scheduled_job', 'ownerMemberId'),
			};
		});
	}

	it('keeps the existing rows', async () => {
		const uuidLengthId = 'u'.repeat(36);
		await insertNodeIdRows(uuidLengthId);

		await runSingleMigration(MIGRATION_NAME);

		expect(await readNodeIds()).toEqual({
			triggerStatus: [uuidLengthId],
			pollerState: [uuidLengthId],
			scheduledJob: [uuidLengthId],
		});
	});

	it('stores node ids of up to 64 characters', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const longestNodeId = 'n'.repeat(64);
		await insertNodeIdRows(longestNodeId);

		expect(await readNodeIds()).toEqual({
			triggerStatus: [longestNodeId],
			pollerState: [longestNodeId],
			scheduledJob: [longestNodeId],
		});
	});

	it.each(['triggerStatus', 'pollerState', 'scheduledJob'] as const)(
		'rejects a node id longer than 64 characters in %s',
		async (table) => {
			await runSingleMigration(MIGRATION_NAME);

			await expect(insertInto[table]('n'.repeat(65))).rejects.toThrow(
				'value too long for type character varying(64)',
			);
		},
	);
});
