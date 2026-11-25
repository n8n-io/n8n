import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentAttentionFlags1795546358454 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_attention_flags')
			.withColumns(
				column('id').uuid.primary.comment('UUIDv7 returned to clients for explicit dismissal'),
				column('type')
					.varchar(32)
					.notNull.withEnumCheck(['session-error'])
					.comment('Attention reason: session-error'),
				column('sessionId')
					.varchar(128)
					.notNull.comment('Session that needs administrator attention'),
			)
			.withTimestamps.withIndexOn(['sessionId', 'type'], true)
			.withForeignKey('sessionId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_attention_flags');
	}
}
