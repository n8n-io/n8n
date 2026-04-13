import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentMemoryTables1777000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agents_resources').withColumns(
			column('id').varchar(255).primary.notNull,
			column('metadata').text,
		).withTimestamps;

		await createTable('agents_threads')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('resourceId').varchar(255).notNull,
				column('title').varchar(255),
				column('metadata').text,
			)
			.withIndexOn('resourceId').withTimestamps;

		await createTable('agents_messages')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('threadId').varchar(255).notNull,
				column('resourceId').varchar(255).notNull,
				column('role').varchar(36).notNull,
				column('type').varchar(36),
				column('content').text.notNull,
			)
			.withIndexOn('threadId')
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_messages');
		await dropTable('agents_threads');
		await dropTable('agents_resources');
	}
}
