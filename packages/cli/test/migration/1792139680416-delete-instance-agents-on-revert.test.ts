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

const migrationName = 'DeleteInstanceAgentsOnRevert1792139680416';

describe('DeleteInstanceAgentsOnRevert migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	function columns(context: TestMigrationContext, names: string[]) {
		return names.map((name) => context.escape.columnName(name)).join(', ');
	}

	async function insertProject(context: TestMigrationContext) {
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} (${columns(context, ['id', 'name', 'type', 'createdAt', 'updatedAt'])})
			 VALUES (:id, 'Agents project', 'team', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id },
		);
		return id;
	}

	async function insertAgent(context: TestMigrationContext, projectId: string | null) {
		const id = randomUUID();
		const scope = projectId === null ? 'instance' : 'project';
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} (${columns(context, ['id', 'name', 'projectId', 'scope', 'createdAt', 'updatedAt'])})
			 VALUES (:id, 'Agent', :projectId, :scope, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, projectId, scope },
		);
		return id;
	}

	/** A thread with one execution: rows that depend on the agent at two levels. */
	async function insertThreadWithExecution(
		context: TestMigrationContext,
		agentId: string,
		projectId: string,
	) {
		const threadId = randomUUID();
		const executionId = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
			 (${columns(context, ['id', 'agentId', 'agentName', 'projectId', 'createdAt', 'updatedAt'])})
			 VALUES (:threadId, :agentId, 'Agent', :projectId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ threadId, agentId, projectId },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution')}
			 (${columns(context, ['id', 'threadId', 'status', 'createdAt', 'updatedAt'])})
			 VALUES (:executionId, :threadId, 'success', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ executionId, threadId },
		);
		return { threadId, executionId };
	}

	async function readIds(context: TestMigrationContext, table: string) {
		const rows = await context.runQuery<Array<{ id: string }>>(
			`SELECT ${context.escape.columnName('id')} AS id FROM ${context.escape.tableName(table)}`,
		);
		return rows.map((row) => row.id).sort();
	}

	it('deletes instance agents and their dependent rows on revert', async () => {
		await runSingleMigration(migrationName);
		const kept = await withContext(async (context) => {
			const projectId = await insertProject(context);
			const projectAgentId = await insertAgent(context, projectId);
			const projectRows = await insertThreadWithExecution(context, projectAgentId, projectId);
			const instanceAgentId = await insertAgent(context, null);
			await insertThreadWithExecution(context, instanceAgentId, projectId);
			return { projectAgentId, ...projectRows };
		});

		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await readIds(context, 'agents')).toEqual([kept.projectAgentId]);
			expect(await readIds(context, 'agent_execution_threads')).toEqual([kept.threadId]);
			expect(await readIds(context, 'agent_execution')).toEqual([kept.executionId]);
			if (context.isSqlite) {
				expect(await context.runQuery('PRAGMA foreign_key_check')).toEqual([]);
			}
		});
	});

	it('leaves no orphan rows after both migrations are reverted', async () => {
		await runSingleMigration(migrationName);
		await withContext(async (context) => {
			const projectId = await insertProject(context);
			await insertThreadWithExecution(context, await insertAgent(context, null), projectId);
		});

		await undoLastSingleMigration();
		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await readIds(context, 'agents')).toEqual([]);
			expect(await readIds(context, 'agent_execution_threads')).toEqual([]);
			expect(await readIds(context, 'agent_execution')).toEqual([]);
			if (context.isSqlite) {
				expect(await context.runQuery('PRAGMA foreign_key_check')).toEqual([]);
			}
		});
	});
});
