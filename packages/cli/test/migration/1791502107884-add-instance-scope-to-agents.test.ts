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

const migrationName = 'AddInstanceScopeToAgents1791502107884';

describe('AddInstanceScopeToAgents migration', () => {
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

	async function insertAgent(
		context: TestMigrationContext,
		projectId: string | null,
		scope?: string,
	) {
		const id = randomUUID();
		const names = ['id', 'name', 'projectId', 'createdAt', 'updatedAt'];
		const values = [':id', "'Agent'", ':projectId', 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'];
		if (scope !== undefined) {
			names.push('scope');
			values.push(':scope');
		}
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} (${columns(context, names)}) VALUES (${values.join(', ')})`,
			{ id, projectId, scope },
		);
		return id;
	}

	/** A thread with one execution, so a cascade has to reach two levels. */
	async function insertThreadWithExecution(
		context: TestMigrationContext,
		agentId: string,
		projectId: string,
	) {
		const threadId = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
			 (${columns(context, ['id', 'agentId', 'agentName', 'projectId', 'createdAt', 'updatedAt'])})
			 VALUES (:threadId, :agentId, 'Agent', :projectId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ threadId, agentId, projectId },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution')}
			 (${columns(context, ['id', 'threadId', 'status', 'createdAt', 'updatedAt'])})
			 VALUES (:id, :threadId, 'success', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id: randomUUID(), threadId },
		);
		return threadId;
	}

	async function readIds(context: TestMigrationContext, table: string) {
		const rows = await context.runQuery<Array<{ id: string }>>(
			`SELECT ${context.escape.columnName('id')} AS id FROM ${context.escape.tableName(table)}`,
		);
		return rows.map((row) => row.id).sort();
	}

	async function readAgent(context: TestMigrationContext, id: string) {
		const [row] = await context.runQuery<Array<{ scope: string; projectId: string | null }>>(
			`SELECT ${columns(context, ['scope', 'projectId'])} FROM ${context.escape.tableName('agents')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id },
		);
		return row;
	}

	it('marks existing agents as project agents and keeps their dependent rows', async () => {
		const { agentId, threadId } = await withContext(async (context) => {
			const projectId = await insertProject(context);
			const agentId = await insertAgent(context, projectId);
			const threadId = await insertThreadWithExecution(context, agentId, projectId);
			return { agentId, threadId };
		});

		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			expect(await readAgent(context, agentId)).toMatchObject({ scope: 'project' });
			expect(await readIds(context, 'agent_execution_threads')).toEqual([threadId]);
			expect(await readIds(context, 'agent_execution')).toHaveLength(1);
		});
	});

	it('stores an instance agent without a project and rejects an unknown scope', async () => {
		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const agentId = await insertAgent(context, null, 'instance');
			expect(await readAgent(context, agentId)).toEqual({ scope: 'instance', projectId: null });

			const projectId = await insertProject(context);
			await expect(insertAgent(context, projectId, 'global')).rejects.toThrow();
		});
	});

	it('rejects an agent without a project before the migration', async () => {
		await withContext(async (context) => {
			await expect(insertAgent(context, null)).rejects.toThrow();
		});
	});

	it('deletes instance agents and their dependent rows on revert, and keeps project agents', async () => {
		await runSingleMigration(migrationName);
		const kept = await withContext(async (context) => {
			const projectId = await insertProject(context);
			const projectAgentId = await insertAgent(context, projectId);
			const projectThreadId = await insertThreadWithExecution(context, projectAgentId, projectId);
			const instanceAgentId = await insertAgent(context, null, 'instance');
			// An instance agent's thread carries the working project.
			await insertThreadWithExecution(context, instanceAgentId, projectId);
			return { projectAgentId, projectThreadId };
		});

		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await readIds(context, 'agents')).toEqual([kept.projectAgentId]);
			expect(await readIds(context, 'agent_execution_threads')).toEqual([kept.projectThreadId]);
			expect(await readIds(context, 'agent_execution')).toHaveLength(1);
			await expect(insertAgent(context, null)).rejects.toThrow();
			// The foreign keys still hold after the table was recreated.
			await expect(
				insertThreadWithExecution(context, randomUUID(), await insertProject(context)),
			).rejects.toThrow();
		});
	});

	it('can apply again after a revert', async () => {
		const agentId = await withContext(async (context) => {
			return await insertAgent(context, await insertProject(context));
		});

		await runSingleMigration(migrationName);
		await undoLastSingleMigration();
		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			expect(await readAgent(context, agentId)).toMatchObject({ scope: 'project' });
			await expect(insertAgent(context, null, 'instance')).resolves.toBeDefined();
		});
	});
});
