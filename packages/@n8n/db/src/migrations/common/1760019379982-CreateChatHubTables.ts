import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_sessions',
	messages: 'chat_messages',
	user: 'user',
	credentials: 'credentials_entity',
	workflows: 'workflow_entity',
	executions: 'execution_entity',
} as const;

export class CreateChatHubTables1760019379982 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.sessions)
			.withColumns(
				column('id').varchar(36).primary,
				column('title').varchar(256).notNull,
				column('ownerId').varchar(36).notNull,
				column('lastMessageAt').timestampTimezone(),

				column('credentialId').varchar(36),
				column('provider').varchar(16), // 'openai', 'anthropic', 'google', 'n8n'
				column('model').varchar(64), // 'gpt-4' ...
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
				column('id').varchar(36).primary.notNull,
				column('sessionId').varchar(36).notNull,
				column('type').varchar(16).notNull, // 'human', 'ai', 'system', 'tool', 'generic'
				column('name').varchar(128).notNull,
				column('responseOfMessageId').varchar(36),
				column('state').varchar(16).default("'active'").notNull, // 'active', 'superseded', 'hidden', 'deleted'
				column('content').text.notNull,
				column('provider').varchar(16), // 'openai', 'anthropic', 'google', 'n8n'
				column('model').varchar(64), // 'gpt-4' ...
				column('workflowId').varchar(36),
				column('turnId').varchar(36),
				column('retryOfMessageId').varchar(36),
				column('runIndex').int.notNull.default(0), // the nth time this message has generated/retried this turn
				column('revisionOfMessageId').varchar(36),
				column('executionId').varchar(36),
			)
			.withForeignKey('sessionId', {
				tableName: table.sessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('responseOfMessageId', {
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
