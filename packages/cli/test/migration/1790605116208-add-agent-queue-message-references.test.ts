import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddAgentQueueMessageReferences1790605116208';

describe('AddAgentQueueMessageReferences migration', () => {
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

	it('enforces queue references and preserves IDs through up, down, and up', async () => {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const threadId = randomUUID();
		const messageId = randomUUID();
		const removedMessageId = randomUUID();
		const createdAt = new Date('2026-05-12T10:00:00.123Z');
		const timestamps = { createdAt, updatedAt: createdAt };
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
		await insert('agent_execution_threads', {
			id: threadId,
			agentId,
			agentName: 'Test agent',
			projectId,
			accessScope: 'project',
			...timestamps,
		});
		for (const id of [messageId, removedMessageId]) {
			await insert('agents_messages', {
				id,
				threadId,
				resourceId: 'resource',
				role: 'user',
				content: '{"role":"user","content":"Original input"}',
				...timestamps,
			});
		}
		await insert('agent_message_queue', {
			threadId,
			source: 'chat',
			payload: '{"message":"pending"}',
			...timestamps,
		});
		const [oldQueueItem] = await rows('agent_message_queue');
		await context.queryRunner.release();
		await expect(runSingleMigration(MIGRATION_NAME)).rejects.toThrow(UserError);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agent_message_queue')).toEqual([oldQueueItem]);
		await context.runQuery(`DELETE FROM ${context.escape.tableName('agent_message_queue')}`);

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		const queueInput = {
			threadId,
			messageId: removedMessageId,
			payload: '{"kind":"preview"}',
		};
		expect(
			await context.queryRunner.hasColumn(`${context.tablePrefix}agent_message_queue`, 'source'),
		).toBe(false);
		await expect(
			insert('agent_message_queue', { ...queueInput, messageId: null }),
		).rejects.toThrow();
		await expect(
			insert('agent_message_queue', { ...queueInput, messageId: randomUUID() }),
		).rejects.toThrow();
		await insert('agent_message_queue', queueInput);
		const [queueItem] = await rows('agent_message_queue');
		expect(BigInt(String(queueItem.id))).toBeGreaterThan(BigInt(String(oldQueueItem.id)));
		await expect(insert('agent_message_queue', queueInput)).rejects.toThrow();
		await context.queryRunner.release();
		await expect(dataSource.undoLastMigration({ transaction: 'each' })).rejects.toThrow(UserError);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agent_message_queue')).toEqual([queueItem]);
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agents_messages')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: removedMessageId },
		);
		expect(await rows('agent_message_queue')).toEqual([]);
		const messages = await rows('agents_messages');

		await context.queryRunner.release();
		await dataSource.undoLastMigration({ transaction: 'each' });
		context = createTestMigrationContext(dataSource);
		expect(await rows('agents_messages')).toEqual(messages);
		const revertedTable = await context.queryRunner.getTable(
			`${context.tablePrefix}agent_message_queue`,
		);
		expect(revertedTable?.findColumnByName('source')).toMatchObject({
			type: context.isPostgres ? 'character varying' : 'varchar',
			length: '32',
			isNullable: false,
			...(context.isPostgres ? { comment: 'Preview or integration source' } : {}),
		});
		expect(
			await context.queryRunner.hasTable(`${context.tablePrefix}agent_execution_message_links`),
		).toBe(true);
		await insert('agent_message_queue', {
			threadId,
			source: 'chat',
			payload: '{"message":"pending"}',
		});
		const [revertedQueueItem] = await rows('agent_message_queue');
		expect(BigInt(String(revertedQueueItem.id))).toBeGreaterThan(BigInt(String(queueItem.id)));
		await context.runQuery(`DELETE FROM ${context.escape.tableName('agent_message_queue')}`);
		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agents_messages')).toEqual(messages);
		await insert('agent_message_queue', { ...queueInput, messageId });
		const [reappliedQueueItem] = await rows('agent_message_queue');
		expect(reappliedQueueItem).not.toHaveProperty('source');
		expect(BigInt(String(reappliedQueueItem.id))).toBeGreaterThan(
			BigInt(String(revertedQueueItem.id)),
		);
	});
});
