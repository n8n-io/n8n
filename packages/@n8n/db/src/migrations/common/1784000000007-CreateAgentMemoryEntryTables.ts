import type { MigrationContext, ReversibleMigration } from '../migration-types';

const MEMORY_ENTRY_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];

export class CreateAgentMemoryEntryTables1784000000007 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await dropTable('agents_memory_entry_cursors');
		await dropTable('agents_memory_entry_sources');
		await dropTable('agents_memory_entries');

		await createTable('agents_memory_entries')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('resourceId').varchar(255).notNull,
				column('content').text.notNull,
				column('contentHash').varchar(64).notNull,
				column('status').varchar(16).notNull.withEnumCheck(MEMORY_ENTRY_STATUSES),
				column('supersededBy').varchar(36),
				column('embeddingModel').varchar(128),
				column('embedding').json,
				column('metadata').json,
				column('lastSeenAt').timestampTimezone(3).notNull,
			)
			.withIndexOn(['agentId', 'resourceId', 'status', 'createdAt', 'id'])
			.withIndexOn(['agentId', 'resourceId', 'contentHash'], true)
			.withIndexOn('supersededBy')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resourceId', {
				tableName: 'agents_resources',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('supersededBy', {
				tableName: 'agents_memory_entries',
				columnName: 'id',
			}).withTimestamps;

		await createTable('agents_memory_entry_sources')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('memoryEntryId').varchar(36).notNull,
				column('observationId').varchar(36).notNull,
				column('threadId').varchar(255).notNull,
				column('evidenceText').text.notNull,
			)
			.withIndexOn(['memoryEntryId', 'observationId', 'evidenceText'], true)
			.withIndexOn('observationId')
			.withIndexOn('threadId')
			.withForeignKey('memoryEntryId', {
				tableName: 'agents_memory_entries',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('observationId', {
				tableName: 'agents_observations',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_memory_entry_cursors').withColumns(
			column('scopeKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS),
			column('scopeId').varchar(255).notNull.primary,
			column('lastIndexedObservationId').varchar(36).notNull,
			column('lastIndexedObservationCreatedAt').timestampTimezone(3).notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_memory_entry_cursors');
		await dropTable('agents_memory_entry_sources');
		await dropTable('agents_memory_entries');
	}
}
