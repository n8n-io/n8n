import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const attachmentSchema = z.object({
	id: z.string().min(1),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
});
const inputSchema = z.object({
	message: z.string(),
	resourceId: z.string().min(1),
	attachments: z.array(attachmentSchema).optional(),
});
const payloadSchema = z.discriminatedUnion('kind', [
	inputSchema.extend({ kind: z.literal('preview') }).passthrough(),
	inputSchema
		.extend({
			kind: z.literal('integration'),
			modelMessage: z.string(),
			author: z.record(z.unknown()),
			platformThreadId: z.string().min(1),
			messageContext: z
				.object({
					platform: z.string(),
					integrationConnectionId: z.string().min(1),
					messageId: z.string().optional(),
				})
				.passthrough(),
		})
		.passthrough(),
]);
type QueuePayload = z.infer<typeof payloadSchema>;

interface QueueRow {
	id: string;
	threadId: string;
	source: string;
	payload: unknown;
	executionId: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
	inputMessageId: string | null;
	inputResourceId: string | null;
}

export class AddAgentQueueMessageReferences1790605116208 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addNotNull, dropColumns, addForeignKey, createIndex },
			escape,
			runQuery,
		} = ctx;
		await addColumns(
			'agent_message_queue',
			[
				column('messageId')
					.varchar(36)
					.comment('Canonical input created when the queue accepts it'),
			],
			{ recreatesOnSqlite: true },
		);
		await this.backfillQueue(ctx);
		await dropColumns('agent_message_queue', ['source'], { recreatesOnSqlite: true });
		await addNotNull('agent_message_queue', 'messageId', { recreatesOnSqlite: true });
		await addForeignKey(
			'agent_message_queue',
			'messageId',
			['agents_messages', 'id'],
			'FK_agent_message_queue_messageId',
			'CASCADE',
		);
		await runQuery(`COMMENT ON COLUMN ${escape.tableName('agent_message_queue')}.${escape.columnName('payload')}
				IS 'Dispatch, authorization, and reply context. Input is stored on the message'`);
		await createIndex('agent_message_queue', ['messageId'], true);
	}

	protected async backfillQueue(ctx: MigrationContext) {
		const { escape, runInBatches } = ctx;
		await runInBatches<QueueRow>(
			`SELECT CAST(queue.${escape.columnName('id')} AS TEXT) AS ${escape.columnName('id')},
				queue.${escape.columnName('threadId')}, queue.${escape.columnName('source')},
				queue.${escape.columnName('payload')}, queue.${escape.columnName('executionId')},
				queue.${escape.columnName('createdAt')}, queue.${escape.columnName('updatedAt')},
				message.${escape.columnName('id')} AS ${escape.columnName('inputMessageId')},
				message.${escape.columnName('resourceId')} AS ${escape.columnName('inputResourceId')}
			FROM ${escape.tableName('agent_message_queue')} queue
			LEFT JOIN ${escape.tableName('agent_execution_message_links')} link
				ON link.${escape.columnName('executionId')} = queue.${escape.columnName('executionId')}
				AND link.${escape.columnName('direction')} = 'input' AND link.${escape.columnName('position')} = 0
			LEFT JOIN ${escape.tableName('agents_messages')} message
				ON message.${escape.columnName('id')} = link.${escape.columnName('messageId')}
				AND message.${escape.columnName('threadId')} = queue.${escape.columnName('threadId')}
			ORDER BY queue.${escape.columnName('id')}`,
			async (rows) => {
				for (const row of rows) await this.backfillItem(ctx, row);
			},
		);
	}

	private async backfillItem(ctx: MigrationContext, row: QueueRow) {
		const { escape, runQuery } = ctx;
		let payload: QueuePayload;
		try {
			payload = payloadSchema.parse(ctx.parseJson(row.payload));
		} catch {
			// An incomplete conversion must roll back instead of losing an accepted message.
			throw new UserError(`Cannot migrate queued agent message ${row.id}: invalid payload`);
		}
		let messageId = row.inputMessageId;
		if (row.executionId !== null) {
			if (!messageId || row.inputResourceId !== payload.resourceId) {
				throw new UserError(
					`Cannot migrate queued agent message ${row.id}: input link is missing or invalid`,
				);
			}
		} else {
			messageId = await this.createInput(ctx, row, payload);
		}
		await runQuery(
			`UPDATE ${escape.tableName('agent_message_queue')}
			SET ${escape.columnName('messageId')} = :messageId, ${escape.columnName('payload')} = :payload
			WHERE ${escape.columnName('id')} = :id`,
			{ id: row.id, messageId, payload: JSON.stringify(this.dispatchPayload(payload)) },
		);
	}

	private async createInput(ctx: MigrationContext, row: QueueRow, payload: QueuePayload) {
		const { escape, runQuery } = ctx;
		const id = randomUUID();
		const parameters = {
			id,
			threadId: row.threadId,
			resourceId: payload.resourceId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_resources')}
			(${['id', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			VALUES (:resourceId, :createdAt, :updatedAt) ON CONFLICT (${escape.columnName('id')}) DO NOTHING`,
			parameters,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_threads')}
			(${['id', 'resourceId', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			VALUES (:threadId, :resourceId, :createdAt, :updatedAt) ON CONFLICT (${escape.columnName('id')}) DO NOTHING`,
			parameters,
		);
		const origin: Record<string, string | undefined> = { source: row.source };
		if (payload.kind === 'integration') {
			origin.integrationConnectionId = payload.messageContext.integrationConnectionId;
			origin.platformMessageId = payload.messageContext.messageId;
			origin.platformThreadId = payload.platformThreadId;
		}
		const modelContent =
			payload.kind === 'integration' && payload.modelMessage !== payload.message
				? JSON.stringify(this.messageContent(payload.modelMessage, payload.attachments ?? []))
				: null;
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_messages')}
			(${['id', 'threadId', 'resourceId', 'role', 'type', 'content', 'author', 'origin', 'modelContent', 'modelContextAt', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			VALUES (:id, :threadId, :resourceId, 'user', NULL, :content, :author, :origin, :modelContent, NULL, :createdAt, :updatedAt)`,
			{
				...parameters,
				content: JSON.stringify(this.messageContent(payload.message, payload.attachments ?? [])),
				author: payload.kind === 'integration' ? JSON.stringify(payload.author) : null,
				origin: JSON.stringify(origin),
				modelContent,
			},
		);
		return id;
	}

	private messageContent(text: string, attachments: Array<z.infer<typeof attachmentSchema>>) {
		const files = attachments.map(({ mimeType, ...fileRef }) => ({
			type: 'file',
			mediaType: mimeType,
			fileRef,
		}));
		return { role: 'user', content: [...(text ? [{ type: 'text', text }] : []), ...files] };
	}

	private dispatchPayload(payload: QueuePayload) {
		if (payload.kind === 'preview') return { kind: 'preview' };
		const {
			message: _message,
			resourceId: _resourceId,
			attachments: _attachments,
			modelMessage: _modelMessage,
			author: _author,
			platformThreadId: _platformThreadId,
			messageContext: fullContext,
			...dispatch
		} = payload;
		const {
			platform: _platform,
			integrationConnectionId: _connectionId,
			messageId: _messageId,
			...messageContext
		} = fullContext;
		return { ...dispatch, messageContext };
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { dropIndex, dropForeignKey, dropColumns, addColumns, column },
			escape,
			runQuery,
		} = ctx;
		await this.requireEmptyQueue(ctx);
		await dropIndex('agent_message_queue', ['messageId']);
		await dropForeignKey(
			'agent_message_queue',
			'messageId',
			['agents_messages', 'id'],
			'FK_agent_message_queue_messageId',
		);
		await dropColumns('agent_message_queue', ['messageId'], { recreatesOnSqlite: true });
		await addColumns(
			'agent_message_queue',
			[column('source').varchar(32).notNull.comment('Preview or integration source')],
			{ recreatesOnSqlite: true },
		);
		await runQuery(`COMMENT ON COLUMN ${escape.tableName('agent_message_queue')}.${escape.columnName('payload')}
				IS 'Input, attachment references, identity, and reply context'`);
	}

	protected async requireEmptyQueue({ runQuery, escape }: MigrationContext) {
		const rows = await runQuery<Array<{ id: string }>>(
			`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_message_queue')} LIMIT 1`,
		);
		if (rows.length)
			throw new UserError('The agent message queue must be empty to change its message references');
	}
}
