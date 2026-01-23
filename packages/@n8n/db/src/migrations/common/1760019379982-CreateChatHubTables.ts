import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
	user: 'user',
	credentials: 'credentials_entity',
	workflows: 'workflow_entity',
	executions: 'execution_entity',
} as const;

export class CreateChatHubTables1760019379982 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.sessions)
			.withColumns(
				column('id').uuid.primary,
				column('title').varchar(256).notNull,
				column('ownerId').uuid.notNull,
				column('lastMessageAt').timestampTimezone(),

				column('credentialId').varchar(36),
				column('provider')
					.varchar(16)
					.comment('ChatHubProvider enum: "openai", "anthropic", "google", "n8n"'),
				column('model')
					.varchar(64)
					.comment('Model name used at the respective Model node, ie. "gpt-4"'),
				column('workflowId').varchar(36),
			)
			.withForeignKey('ownerId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('credentialId', {
				tableName: table.credentials,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('workflowId', {
				tableName: table.workflows,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await createTable(table.messages)
			.withColumns(
				column('id').uuid.primary.notNull,
				column('sessionId').uuid.notNull,
				column('previousMessageId').uuid,
				column('revisionOfMessageId').uuid,
				column('turnId').uuid,
				column('retryOfMessageId').uuid,
				column('type')
					.varchar(16)
					.notNull.comment('ChatHubMessageType enum: "human", "ai", "system", "tool", "generic"'),
				column('name').varchar(128).notNull,
				column('state')
					.varchar(16)
					.default("'active'")
					.notNull.comment('ChatHubMessageState enum: "active", "superseded", "hidden", "deleted"'),
				column('content').text.notNull,
				column('provider')
					.varchar(16)
					.comment('ChatHubProvider enum: "openai", "anthropic", "google", "n8n"'),
				column('model')
					.varchar(64)
					.comment('Model name used at the respective Model node, ie. "gpt-4"'),
				column('workflowId').varchar(36),
				column('runIndex')
					.int.notNull.default(0)
					.comment('The nth attempt this message has been generated/retried this turn'),
				column('executionId').int,
			)
			.withForeignKey('sessionId', {
				tableName: table.sessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('previousMessageId', {
				tableName: table.messages,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: table.workflows,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('turnId', {
				tableName: table.messages,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('retryOfMessageId', {
				tableName: table.messages,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('revisionOfMessageId', {
				tableName: table.messages,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('executionId', {
				tableName: table.executions,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.messages);
		await dropTable(table.sessions);
	}
}
