import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse, UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddAgentQueueMessageReferences1790605116208';
const createdAt = new Date('2026-05-12T10:00:00.123Z');
const updatedAt = new Date('2026-05-12T10:01:00.456Z');
const timestamps = { createdAt, updatedAt };
const previewPayload = {
	kind: 'preview',
	message: 'Pending input',
	resourceId: 'preview-resource',
	userId: 'owner',
};

function readJson(value: unknown): unknown {
	return typeof value === 'string' ? jsonParse(value) : value;
}

describe('AddAgentQueueMessageReferences migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
		projectId = randomUUID();
		agentId = randomUUID();
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
	});

	afterEach(async () => {
		await context?.queryRunner.release();
	});

	afterAll(async () => {
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
			`SELECT * FROM ${context.escape.tableName(table)} ORDER BY ${context.escape.columnName('id')}`,
		);
	}

	async function createThread() {
		const threadId = randomUUID();
		await insert('agent_execution_threads', {
			id: threadId,
			agentId,
			agentName: 'Test agent',
			projectId,
			accessScope: 'project',
			...timestamps,
		});
		return threadId;
	}

	async function migrate() {
		await context.queryRunner.release();
		try {
			await runSingleMigration(MIGRATION_NAME);
		} finally {
			context = createTestMigrationContext(dataSource);
		}
	}

	it('backfills queued input, preserves started input, and keeps constraints through rollback', async () => {
		const previewThread = await createThread();
		const integrationThread = await createThread();
		const activeThread = await createThread();
		const executionId = randomUUID();
		const messageId = randomUUID();
		const attachment = {
			id: 'attachment',
			fileName: 'image.png',
			mimeType: 'image/png',
			sizeBytes: 3,
		};
		const filePart = {
			type: 'file',
			mediaType: 'image/png',
			fileRef: { id: 'attachment', fileName: 'image.png', sizeBytes: 3 },
		};
		const author = { userId: 'sender', displayName: 'Sender' };
		const messageContext = {
			platform: 'slack',
			integrationConnectionId: 'connection',
			messageId: 'platform-message',
			target: { type: 'thread', threadId: 'platform-thread' },
			replyMessageId: 'reply-message',
			replyExpectation: 'optional',
			updatedAt: createdAt.toISOString(),
		};
		const integrationPayload = {
			kind: 'integration',
			message: 'Original input',
			resourceId: 'integration-resource',
			modelMessage: 'Enriched input',
			attachments: [attachment],
			author,
			credentialId: 'credential',
			platformThreadId: 'platform-thread',
			sender: { userId: 'sender', isMe: false },
			messageContext,
			contextConversation: { threadId: integrationThread },
			forceBuffered: false,
			slackThreadContext: { channelId: 'channel', threadTs: '123.456' },
		};
		await insert('agent_message_queue', {
			threadId: previewThread,
			source: 'chat',
			payload: JSON.stringify({ ...previewPayload, message: '', attachments: [attachment] }),
			...timestamps,
		});
		await insert('agent_message_queue', {
			threadId: integrationThread,
			source: 'slack',
			payload: JSON.stringify(integrationPayload),
			...timestamps,
		});
		await insert('agents_resources', { id: 'active-resource', ...timestamps });
		await insert('agents_threads', {
			id: activeThread,
			resourceId: 'active-resource',
			...timestamps,
		});
		await insert('agents_messages', {
			id: messageId,
			threadId: activeThread,
			resourceId: 'active-resource',
			role: 'user',
			content: JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Started input' }] }),
			modelContent: JSON.stringify({
				role: 'user',
				content: [{ type: 'text', text: 'Runtime enrichment' }],
			}),
			modelContextAt: updatedAt,
			origin: '{"source":"chat"}',
			...timestamps,
		});
		await insert('agent_execution', {
			id: executionId,
			threadId: activeThread,
			status: 'success',
			hitlStatus: 'suspended',
			...timestamps,
		});
		await insert('agent_execution_message_links', {
			executionId,
			messageId,
			direction: 'input',
			position: 0,
			createdAt,
		});
		await insert('agent_checkpoints', {
			runId: 'suspended-run',
			agentId,
			threadId: activeThread,
			state: JSON.stringify({
				status: 'suspended',
				persistence: { threadId: activeThread, hostMetadata: { n8nExecutionId: executionId } },
				messages: [{ id: messageId }],
			}),
			...timestamps,
		});
		await insert('agent_message_queue', {
			threadId: activeThread,
			executionId,
			source: 'chat',
			payload: JSON.stringify({
				...previewPayload,
				resourceId: 'active-resource',
				message: 'Started input',
			}),
			...timestamps,
		});
		// Cross a batch boundary while earlier queue rows are updated in place.
		for (let index = 0; index < 101; index++) {
			await insert('agent_message_queue', {
				threadId: previewThread,
				source: 'chat',
				payload: JSON.stringify({ ...previewPayload, message: `Pending ${index}` }),
				...timestamps,
			});
		}
		await insert('agent_message_queue', {
			threadId: previewThread,
			source: 'chat',
			payload: JSON.stringify(previewPayload),
			...timestamps,
		});
		const originalQueue = await rows('agent_message_queue');
		const deletedId = originalQueue.pop()!.id;
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agent_message_queue')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: deletedId },
		);
		const [originalMessage] = await rows('agents_messages');
		const snapshots = new Map<string, unknown>();
		for (const table of [
			'agent_execution_threads',
			'agent_execution',
			'agent_checkpoints',
			'agent_execution_message_links',
		]) {
			snapshots.set(
				table,
				await context.runQuery(`SELECT * FROM ${context.escape.tableName(table)}`),
			);
		}

		await migrate();

		const queue = await rows('agent_message_queue');
		const messages = await rows('agents_messages');
		expect(messages).toHaveLength(originalQueue.length);
		expect(queue).toHaveLength(originalQueue.length);
		for (const [index, item] of queue.entries()) {
			const { source: _source, payload: _payload, ...original } = originalQueue[index];
			expect(item).toMatchObject(original);
			expect(item).not.toHaveProperty('source');
			expect(item.messageId).toEqual(expect.any(String));
		}
		const preview = messages.find(({ id }) => id === queue[0].messageId)!;
		expect(preview).toMatchObject({
			threadId: previewThread,
			resourceId: 'preview-resource',
			role: 'user',
			type: null,
			author: null,
			modelContent: null,
			modelContextAt: null,
			createdAt: queue[0].createdAt,
			updatedAt: queue[0].updatedAt,
		});
		expect(readJson(preview.content)).toEqual({ role: 'user', content: [filePart] });
		expect(readJson(preview.origin)).toEqual({ source: 'chat' });
		expect(readJson(queue[0].payload)).toEqual({ kind: 'preview' });
		const integration = messages.find(({ id }) => id === queue[1].messageId)!;
		expect(integration).toMatchObject({
			threadId: integrationThread,
			resourceId: 'integration-resource',
			modelContextAt: null,
		});
		expect(readJson(integration.content)).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'Original input' }, filePart],
		});
		expect(readJson(integration.modelContent)).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'Enriched input' }, filePart],
		});
		expect(readJson(integration.author)).toEqual(author);
		expect(readJson(integration.origin)).toEqual({
			source: 'slack',
			integrationConnectionId: 'connection',
			platformMessageId: 'platform-message',
			platformThreadId: 'platform-thread',
		});
		expect(readJson(queue[1].payload)).toEqual({
			kind: 'integration',
			credentialId: 'credential',
			sender: integrationPayload.sender,
			contextConversation: integrationPayload.contextConversation,
			forceBuffered: false,
			slackThreadContext: integrationPayload.slackThreadContext,
			messageContext: {
				target: messageContext.target,
				replyMessageId: 'reply-message',
				replyExpectation: 'optional',
				updatedAt: messageContext.updatedAt,
			},
		});
		expect(queue[2].messageId).toBe(messageId);
		expect(messages.find(({ id }) => id === messageId)).toEqual(originalMessage);
		const lastMessage = messages.find(({ id }) => id === queue.at(-1)!.messageId)!;
		expect(readJson(lastMessage.content)).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'Pending 100' }],
		});
		expect(await rows('agents_resources')).toHaveLength(3);
		expect(await rows('agents_threads')).toHaveLength(3);
		for (const [table, snapshot] of snapshots) {
			expect(await context.runQuery(`SELECT * FROM ${context.escape.tableName(table)}`)).toEqual(
				snapshot,
			);
		}

		const queueInput = {
			threadId: previewThread,
			messageId: preview.id as string,
			payload: '{"kind":"preview"}',
		};
		await expect(
			insert('agent_message_queue', { ...queueInput, messageId: null }),
		).rejects.toThrow();
		await expect(
			insert('agent_message_queue', { ...queueInput, messageId: randomUUID() }),
		).rejects.toThrow();
		await expect(insert('agent_message_queue', queueInput)).rejects.toThrow();
		await context.queryRunner.release();
		await expect(dataSource.undoLastMigration({ transaction: 'each' })).rejects.toThrow(UserError);
		context = createTestMigrationContext(dataSource);
		expect(await rows('agent_message_queue')).toEqual(queue);
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agents_messages')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: preview.id },
		);
		expect(await rows('agent_message_queue')).toHaveLength(queue.length - 1);
		await context.runQuery(`DELETE FROM ${context.escape.tableName('agent_message_queue')}`);
		await insert('agent_message_queue', { ...queueInput, messageId: lastMessage.id as string });
		const [newItem] = await rows('agent_message_queue');
		expect(BigInt(String(newItem.id))).toBeGreaterThan(BigInt(String(deletedId)));
		await context.runQuery(`DELETE FROM ${context.escape.tableName('agent_message_queue')}`);
		const retainedMessages = await rows('agents_messages');
		await context.queryRunner.release();
		await dataSource.undoLastMigration({ transaction: 'each' });
		context = createTestMigrationContext(dataSource);
		expect(await rows('agents_messages')).toEqual(retainedMessages);
		const reverted = await context.queryRunner.getTable(
			`${context.tablePrefix}agent_message_queue`,
		);
		expect(reverted?.findColumnByName('source')).toMatchObject({ length: '32', isNullable: false });
		await insert('agent_message_queue', {
			threadId: previewThread,
			source: 'chat',
			payload: JSON.stringify(previewPayload),
		});
		const [revertedItem] = await rows('agent_message_queue');
		expect(BigInt(String(revertedItem.id))).toBeGreaterThan(BigInt(String(newItem.id)));
		await context.runQuery(`DELETE FROM ${context.escape.tableName('agent_message_queue')}`);
		await migrate();
		expect(await rows('agents_messages')).toEqual(retainedMessages);
		await insert('agent_message_queue', { ...queueInput, messageId: lastMessage.id as string });
		const [reappliedItem] = await rows('agent_message_queue');
		expect(BigInt(String(reappliedItem.id))).toBeGreaterThan(BigInt(String(revertedItem.id)));
	});

	it.each(['invalid payload', 'missing input link'])(
		'preserves queue data when an item has %s',
		async (problem) => {
			const threadId = await createThread();
			const executionId = randomUUID();
			await insert('agent_execution', {
				id: executionId,
				threadId,
				status: 'running',
				...timestamps,
			});
			await insert('agent_message_queue', {
				threadId,
				source: 'chat',
				payload: JSON.stringify(previewPayload),
				...timestamps,
			});
			await insert('agent_message_queue', {
				threadId,
				source: 'chat',
				executionId: problem === 'missing input link' ? executionId : null,
				payload: problem === 'invalid payload' ? 'null' : JSON.stringify(previewPayload),
				...timestamps,
			});
			const original = await rows('agent_message_queue');
			await expect(migrate()).rejects.toThrow(UserError);
			expect(await rows('agent_message_queue')).toEqual(original);
			expect(await rows('agents_messages')).toEqual([]);
			expect(await rows('agents_threads')).toEqual([]);
			expect(await rows('agents_resources')).toEqual([]);
			expect(
				await context.queryRunner.hasColumn(
					`${context.tablePrefix}agent_message_queue`,
					'messageId',
				),
			).toBe(false);
		},
	);
});
