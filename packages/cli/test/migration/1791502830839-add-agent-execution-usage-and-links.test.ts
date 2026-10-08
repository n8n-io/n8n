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

const migrationName = 'AddAgentExecutionUsageAndLinks1791502830839';

describe('AddAgentExecutionUsageAndLinks migration', () => {
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

	/** An execution with an input message link, so a table recreate would show as lost links. */
	async function insertExecutionWithMessageLink(context: TestMigrationContext) {
		const ids = {
			projectId: randomUUID(),
			agentId: randomUUID(),
			threadId: randomUUID(),
			executionId: randomUUID(),
			messageId: randomUUID(),
		};
		const table = (name: string) => context.escape.tableName(name);
		await context.runQuery(
			`INSERT INTO ${table('project')} (${columns(context, ['id', 'name', 'type', 'createdAt', 'updatedAt'])})
			 VALUES (:projectId, 'Project', 'team', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agents')} (${columns(context, ['id', 'name', 'projectId'])})
			 VALUES (:agentId, 'Agent', :projectId)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agent_execution_threads')} (${columns(context, ['id', 'agentId', 'agentName', 'projectId'])})
			 VALUES (:threadId, :agentId, 'Agent', :projectId)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agent_execution')} (${columns(context, ['id', 'threadId', 'status', 'promptTokens'])})
			 VALUES (:executionId, :threadId, 'success', 42)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agents_resources')} (${columns(context, ['id'])}) VALUES (:threadId)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agents_threads')} (${columns(context, ['id', 'resourceId'])}) VALUES (:threadId, :threadId)`,
			ids,
		);
		await context.runQuery(
			`INSERT INTO ${table('agents_messages')} (${columns(context, ['id', 'threadId', 'resourceId', 'role', 'content'])})
			 VALUES (:messageId, :threadId, :threadId, 'user', :content)`,
			{ ...ids, content: JSON.stringify({ role: 'user', content: [] }) },
		);
		await context.runQuery(
			`INSERT INTO ${table('agent_execution_message_links')} (${columns(context, ['executionId', 'messageId', 'direction', 'position'])})
			 VALUES (:executionId, :messageId, 'input', 0)`,
			ids,
		);
		return ids;
	}

	async function countLinks(context: TestMigrationContext, executionId: string) {
		const [row] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${context.escape.tableName('agent_execution_message_links')}
			 WHERE ${context.escape.columnName('executionId')} = :executionId`,
			{ executionId },
		);
		return Number(row.count);
	}

	const NEW_COLUMNS = [
		'cacheReadTokens',
		'cacheWriteTokens',
		'parentExecutionId',
		'rootExecutionId',
	] as const;

	async function readExecution(context: TestMigrationContext, executionId: string) {
		const [row] = await context.runQuery<Array<Record<string, unknown>>>(
			`SELECT * FROM ${context.escape.tableName('agent_execution')}
			 WHERE ${context.escape.columnName('id')} = :executionId`,
			{ executionId },
		);
		return row;
	}

	/** A delegated execution in the same thread, linked to the given parent. */
	async function insertLinkedChild(
		context: TestMigrationContext,
		ids: { threadId: string; executionId: string },
	) {
		const childId = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution')} (${columns(context, ['id', 'threadId', 'status', 'parentExecutionId', 'rootExecutionId'])})
			 VALUES (:childId, :threadId, 'success', :executionId, :executionId)`,
			{ ...ids, childId },
		);
		return childId;
	}

	it('adds nullable cache and link columns and keeps existing executions and their links', async () => {
		const ids = await withContext(insertExecutionWithMessageLink);

		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const row = await readExecution(context, ids.executionId);
			for (const name of NEW_COLUMNS) expect(row[name]).toBeNull();
			expect(Number(row.promptTokens)).toBe(42);
			expect(await countLinks(context, ids.executionId)).toBe(1);

			await context.runQuery(
				`UPDATE ${context.escape.tableName('agent_execution')}
				 SET ${context.escape.columnName('cacheReadTokens')} = 30, ${context.escape.columnName('cacheWriteTokens')} = 2
				 WHERE ${context.escape.columnName('id')} = :executionId`,
				ids,
			);
			const updated = await readExecution(context, ids.executionId);
			expect(Number(updated.cacheReadTokens)).toBe(30);
			expect(Number(updated.cacheWriteTokens)).toBe(2);
		});
	});

	it('clears the links of child executions when their parent execution is deleted', async () => {
		const ids = await withContext(insertExecutionWithMessageLink);
		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const childId = await insertLinkedChild(context, ids);
			expect(await readExecution(context, childId)).toMatchObject({
				parentExecutionId: ids.executionId,
				rootExecutionId: ids.executionId,
			});

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('agent_execution')} WHERE ${context.escape.columnName('id')} = :executionId`,
				ids,
			);

			expect(await readExecution(context, childId)).toMatchObject({
				parentExecutionId: null,
				rootExecutionId: null,
			});
		});
	});

	it('rejects a link to an execution that does not exist', async () => {
		const ids = await withContext(insertExecutionWithMessageLink);
		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			await expect(
				insertLinkedChild(context, { threadId: ids.threadId, executionId: randomUUID() }),
			).rejects.toThrow();
		});
	});

	it('drops the columns on revert and keeps existing executions and their links', async () => {
		const ids = await withContext(insertExecutionWithMessageLink);
		await runSingleMigration(migrationName);
		const childId = await withContext(async (context) => await insertLinkedChild(context, ids));

		await undoLastSingleMigration();

		await withContext(async (context) => {
			const row = await readExecution(context, ids.executionId);
			expect(row).toBeDefined();
			for (const name of NEW_COLUMNS) expect(Object.keys(row)).not.toContain(name);
			expect(await readExecution(context, childId)).toBeDefined();
			expect(await countLinks(context, ids.executionId)).toBe(1);
		});
	});
});
