import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentMemoryTables1785000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agents_memory_profiles')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('scopeKind').varchar(32).notNull,
				column('agentId').varchar(36).notNull,
				column('resourceId').varchar(255).notNull,
				column('content').text.notNull,
				column('metadata').json,
			)
			.withIndexOn(['scopeKind', 'agentId', 'resourceId'], true)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_memory_profiles');
	}
}
