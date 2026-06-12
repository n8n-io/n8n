import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AGENT_CHAT_INTEGRATION_TYPES = ['telegram', 'slack', 'linear'];

export class CreateAgentChatSubscriptions1784000000030 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_chat_subscriptions')
			.withColumns(
				column('agentId').varchar(36).primary.comment('Agent that owns this subscription'),
				column('integrationType')
					.varchar(64)
					.primary.withEnumCheck(AGENT_CHAT_INTEGRATION_TYPES)
					.comment('Chat integration platform for this subscription'),
				column('credentialId')
					.varchar(255)
					.primary.comment('Credential connection that owns this subscription'),
				column('threadId')
					.varchar(255)
					.primary.comment('Platform thread ID the agent is subscribed to'),
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_chat_subscriptions');
	}
}
