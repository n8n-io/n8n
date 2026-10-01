import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Build the agent tables and required indexes for it - handling storage of the new
 * agents a first-class citizens feature.
 */
export class CreateAgentTables1783000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column } }: MigrationContext) {
		await createTable('agents')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').varchar(512),
				column('projectId').varchar(255).notNull,
				column('credentialId').varchar(255),
				column('provider').varchar(128),
				column('model').varchar(128),
				column('integrations').json.notNull.default("'[]'"),
				column('schema').json,
				column('tools').json.notNull.default("'{}'"),
				column('skills').json.notNull.default("'{}'"),
				column('versionId').varchar(36),
			)
			.withIndexOn('projectId')
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex('agents', ['projectId']);

		await createTable('agent_checkpoints')
			.withColumns(
				column('runId').varchar(255).primary.notNull,
				column('agentId').varchar(255),
				column('state').text,
				column('expired').bool.default(false).notNull,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

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
				column('content').json.notNull,
			)
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex('agents_messages', ['threadId', 'createdAt']);

		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary.notNull,
				column('schema').json,
				column('publishedFromVersionId').varchar(36).notNull,
				column('model').varchar(128),
				column('provider').varchar(128),
				column('credentialId').varchar(36),
				column('publishedById').uuid,
				column('tools').json,
				column('skills').json,
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
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_published_version');
		await dropTable('agents_messages');
		await dropTable('agents_threads');
		await dropTable('agents_resources');
		await dropTable('agent_checkpoints');
		await dropTable('agents');
	}
}
