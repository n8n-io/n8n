import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentPublishedVersionTable1780000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary.notNull,
				column('schema').text,
				column('model').varchar(128),
				column('provider').varchar(128),
				column('credentialId').varchar(36),
				column('publishedAt').timestamp().notNull,
				column('publishedById').varchar(36),
				column('createdAt').timestamp().notNull,
				column('updatedAt').timestamp().notNull,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_published_version');
	}
}
