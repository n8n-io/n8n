import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddAgentExecutionMessages1790590278292';

describe('AddAgentExecutionMessages migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	afterAll(async () => {
		await context?.queryRunner.release();
		await Container.get(DbConnection).close();
	});

	async function insert(table: string, values: Record<string, string | number | Date | null>) {
		const keys = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${keys.map(context.escape.columnName).join(', ')}) VALUES (${keys.map((key) => ':' + key).join(', ')})`,
			values,
		);
	}

	async function rows(table: string) {
		return await context.runQuery<Array<Record<string, unknown>>>(
			`SELECT * FROM ${context.escape.tableName(table)}`,
		);
	}

	it('preserves history and cursors through up, down, and up and enforces message relations', async () => {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const threadId = randomUUID();
		const messageId = randomUUID();
		const executionId = randomUUID();
		const createdAt = new Date('2026-05-12T10:00:00.123Z');
		const timestamps = { createdAt, updatedAt: createdAt };
		const content = JSON.stringify({
			role: 'user',
			content: [
				{ type: 'text', text: 'Original input' },
				{
					type: 'file',
					mediaType: 'image/png',
					fileRef: { id: 'attachment-1', fileName: 'image.png', sizeBytes: 3 },
				},
			],
		});
		await insert('project', { id: projectId, name: 'Test project', type: 'team', ...timestamps });
		await insert('agents', {
			id: agentId,
			name: 'Test agent',
			projectId,
			integrations: '[]',
			tools: '{}',
			skills: '{}',
			...timestamps,
		});
		await insert('agents_resources', { id: 'resource', ...timestamps });
		await insert('agents_threads', { id: threadId, resourceId: 'resource', ...timestamps });
		await insert('agents_threads', { id: 'builder-thread', resourceId: 'resource', ...timestamps });
		await insert('agents_messages', {
			id: messageId,
			threadId,
			resourceId: 'resource',
			role: 'user',
			content,
			...timestamps,
		});
		await insert('agents_messages', {
			id: randomUUID(),
			threadId: 'builder-thread',
			resourceId: 'resource',
			role: 'user',
			content,
			...timestamps,
		});
		await insert('agents_observation_cursors', {
			agentId,
			observationScopeId: threadId,
			lastObservedMessageId: messageId,
			lastObservedAt: createdAt,
			...timestamps,
		});
		await insert('agents_memory_entry_candidates', {
			id: randomUUID(),
			agentId,
			resourceId: 'resource',
			threadId,
			sourceMessageId: messageId,
			runId: 'run-1',
			toolCallId: 'call-1',
			content: 'Preference',
			evidenceText: 'Original input',
			kind: 'preference',
			...timestamps,
		});
		await insert('agent_execution_threads', {
			id: threadId,
			agentId,
			agentName: 'Test agent',
			projectId,
			accessScope: 'project',
			...timestamps,
		});
		await insert('agent_execution', {
			id: executionId,
			threadId,
			status: 'success',
			userMessage: 'Legacy input',
			author: '{"id":"author-1","name":"Author"}',
			attachments: '[]',
			hitlStatus: 'suspended',
			storedAt: 'fs',
			...timestamps,
		});
		await insert('agent_checkpoints', {
			runId: 'run-1',
			agentId,
			threadId,
			state: '{"status":"suspended"}',
			...timestamps,
		});
		await insert('agent_message_queue', {
			threadId,
			source: 'chat',
			payload: '{"message":"pending"}',
			...timestamps,
		});

		const messages = await rows('agents_messages');
		const unchangedTables = [
			'agents_observation_cursors',
			'agents_memory_entry_candidates',
			'agent_execution',
			'agent_checkpoints',
			'agent_message_queue',
		];
		const snapshots = new Map<string, Array<Record<string, unknown>>>();
		for (const table of unchangedTables) snapshots.set(table, await rows(table));

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agent_execution_message_links')).toEqual([]);
		for (const message of messages) {
			expect(await rows('agents_messages')).toContainEqual({
				...message,
				author: null,
				origin: null,
				modelContent: null,
				modelContextAt: null,
			});
		}
		for (const [table, snapshot] of snapshots) {
			expect(new Set(await rows(table))).toEqual(new Set(snapshot));
		}

		const timestamp = `COALESCE(${context.escape.columnName('modelContextAt')}, ${context.escape.columnName('createdAt')})`;
		const query = `SELECT * FROM ${context.escape.tableName('agents_messages')}
			WHERE ${context.escape.columnName('threadId')} = :threadId
			AND (${context.escape.columnName('modelContextAt')} IS NOT NULL OR ${context.escape.columnName('origin')} IS NULL)
			AND ${timestamp} < :before
			ORDER BY ${timestamp} DESC, ${context.escape.columnName('id')} DESC LIMIT 10`;
		const history = await context.runQuery<Array<{ id: string }>>(query, {
			threadId,
			before: new Date('2026-05-13'),
		});
		expect(history.map(({ id }) => id)).toEqual([messageId]);
		if (context.isPostgres) {
			// Older transactions can temporarily prevent the planner from using this new index.
			const [index] = await context.runQuery<Array<{ definition: string }>>(
				'SELECT pg_get_indexdef(:indexName::regclass) AS definition',
				{ indexName: context.escape.indexName('agents_messages_model_context') },
			);
			expect(index.definition).toMatch(
				/ USING btree \("threadId", COALESCE\("modelContextAt", "createdAt"\), id\)$/,
			);
		} else {
			const plan = await context.runQuery<Array<Record<string, string | number>>>(
				`EXPLAIN QUERY PLAN ${query}`,
				{ threadId, before: new Date('2026-05-13') },
			);
			expect(plan.flatMap(Object.values).join('\n')).not.toContain('TEMP B-TREE');
		}

		const outputId = randomUUID();
		await insert('agents_messages', {
			id: outputId,
			threadId,
			resourceId: 'resource',
			role: 'assistant',
			content: '{}',
			...timestamps,
		});
		const input = { executionId, messageId, direction: 'input', position: 0 };
		await insert('agent_execution_message_links', input);
		await expect(
			insert('agent_execution_message_links', { ...input, position: 1 }),
		).rejects.toThrow();
		await expect(
			insert('agent_execution_message_links', { ...input, direction: 'output' }),
		).rejects.toThrow();
		await expect(
			insert('agent_execution_message_links', { ...input, messageId: outputId }),
		).rejects.toThrow();
		await expect(
			insert('agent_execution_message_links', { ...input, executionId: randomUUID() }),
		).rejects.toThrow();
		await expect(
			insert('agent_execution_message_links', { ...input, messageId: randomUUID(), position: 1 }),
		).rejects.toThrow();
		await expect(
			insert('agent_execution_message_links', {
				...input,
				messageId: outputId,
				direction: 'invalid',
				position: 1,
			}),
		).rejects.toThrow();
		await insert('agent_execution_message_links', {
			...input,
			messageId: outputId,
			direction: 'output',
		});
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agents_messages')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: outputId },
		);
		expect(await rows('agent_execution_message_links')).toHaveLength(1);
		const nextExecutionId = randomUUID();
		await insert('agent_execution', {
			id: nextExecutionId,
			threadId,
			status: 'success',
			...timestamps,
		});
		await insert('agent_execution_message_links', { ...input, executionId: nextExecutionId });
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agent_execution')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: nextExecutionId },
		);
		expect(await rows('agent_execution_message_links')).toHaveLength(1);

		await context.queryRunner.release();
		await dataSource.undoLastMigration({ transaction: 'each' });
		context = createTestMigrationContext(dataSource);
		expect(
			await context.queryRunner.hasTable(`${context.tablePrefix}agent_execution_message_links`),
		).toBe(false);
		expect(new Set(await rows('agents_messages'))).toEqual(new Set(messages));
		for (const [table, snapshot] of snapshots) {
			expect(new Set(await rows(table))).toEqual(new Set(snapshot));
		}
		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agents_messages')).toHaveLength(2);
		expect(await rows('agent_execution_message_links')).toEqual([]);
	});
});
