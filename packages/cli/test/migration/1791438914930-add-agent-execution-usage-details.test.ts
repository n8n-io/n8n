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

const migrationName = 'AddAgentExecutionUsageDetails1791438914930';

describe('AddAgentExecutionUsageDetails migration', () => {
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

	async function readUsageDetails(context: TestMigrationContext, executionId: string) {
		const [row] = await context.runQuery<
			Array<{ usageDetails: unknown; promptTokens: number | string }>
		>(
			`SELECT ${columns(context, ['usageDetails', 'promptTokens'])} FROM ${context.escape.tableName('agent_execution')}
			 WHERE ${context.escape.columnName('id')} = :executionId`,
			{ executionId },
		);
		return row;
	}

	it('adds a nullable usage details column and keeps existing executions and their links', async () => {
		const { executionId } = await withContext(insertExecutionWithMessageLink);

		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const row = await readUsageDetails(context, executionId);
			expect(row.usageDetails).toBeNull();
			expect(Number(row.promptTokens)).toBe(42);
			expect(await countLinks(context, executionId)).toBe(1);

			const usageDetails = { cacheReadTokens: 800, cacheWriteTokens: 100 };
			await context.runQuery(
				`UPDATE ${context.escape.tableName('agent_execution')} SET ${context.escape.columnName('usageDetails')} = :usageDetails
				 WHERE ${context.escape.columnName('id')} = :executionId`,
				{ executionId, usageDetails: JSON.stringify(usageDetails) },
			);
			const updated = await readUsageDetails(context, executionId);
			// SQLite returns the JSON text, Postgres the parsed value.
			const stored =
				typeof updated.usageDetails === 'string'
					? jsonParse(updated.usageDetails)
					: updated.usageDetails;
			expect(stored).toEqual(usageDetails);
		});
	});

	it('drops the column on revert and keeps existing executions and their links', async () => {
		const { executionId } = await withContext(insertExecutionWithMessageLink);
		await runSingleMigration(migrationName);

		await undoLastSingleMigration();

		await withContext(async (context) => {
			const [row] = await context.runQuery<Array<Record<string, unknown>>>(
				`SELECT * FROM ${context.escape.tableName('agent_execution')}
				 WHERE ${context.escape.columnName('id')} = :executionId`,
				{ executionId },
			);
			expect(row).toBeDefined();
			expect(Object.keys(row)).not.toContain('usageDetails');
			expect(await countLinks(context, executionId)).toBe(1);
		});
	});
});
