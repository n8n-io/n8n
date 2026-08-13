import type { MigrationContext, ReversibleMigration } from '../migration-types';

const MEMORY_ENTRY_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];

export class CreateAgentMemoryEntryTables1784000000009 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agents_memory_entries')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('resourceId')
					.varchar(255)
					.notNull.comment('agents_resources.id partition used for episodic recall scope'),
				column('content').text.notNull,
				column('contentHash').varchar(64).notNull,
				column('status').varchar(16).notNull.withEnumCheck(MEMORY_ENTRY_STATUSES),
				column('supersededBy').varchar(36).comment('Self-reference to replacement memory entry'),
				column('embeddingModel').varchar(128).comment('Embedding model used to produce embedding'),
				column('embedding').json.comment('Embedding vector for episodic recall'),
				column('metadata').json.comment('Optional system metadata for ranking and debugging'),
				column('lastSeenAt')
					.timestampTimezone(3)
					.notNull.comment(
						'Last time equivalent content was observed; updatedAt tracks row mutation time',
					),
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

		await createTable('agents_memory_entry_locks')
			.withColumns(
				column('agentId').varchar(36).notNull.primary,
				column('resourceId')
					.varchar(255)
					.notNull.primary.comment('agents_resources.id partition locked for episodic indexing'),
				column('holderId')
					.varchar(64)
					.notNull.comment('Ephemeral background-task lock owner token'),
				column('heldUntil').timestampTimezone(3).notNull,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resourceId', {
				tableName: 'agents_resources',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_memory_entry_sources')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId')
					.varchar(36)
					.notNull.comment('Agent that owns the linked episodic memory entry source'),
				column('memoryEntryId').varchar(36).notNull,
				column('observationId').varchar(36).notNull,
				column('threadId')
					.varchar(255)
					.notNull.comment('Source conversation thread that produced the linked observation'),
				column('evidenceHash')
					.varchar(64)
					.notNull.comment('Bounded hash used to deduplicate exact evidence links'),
				column('evidenceText').text.notNull.comment(
					'Exact source evidence text from the observation, not recall scope',
				),
			)
			.withIndexOn(['memoryEntryId', 'observationId', 'evidenceHash'], true)
			.withIndexOn('observationId')
			.withIndexOn(['agentId', 'threadId'])
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('memoryEntryId', {
				tableName: 'agents_memory_entries',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('observationId', {
				tableName: 'agents_observations',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('threadId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_memory_entry_cursors').withColumns(
			column('scopeKind')
				.varchar(20)
				.notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS)
				.comment('Observation-log scope kind being indexed into episodic memory'),
			column('scopeId')
				.varchar(255)
				.notNull.primary.comment('Observation-log scope ID being indexed into episodic memory'),
			column('lastIndexedObservationId')
				.varchar(36)
				.notNull.comment('Last observation-log row indexed into episodic memory'),
			column('lastIndexedObservationCreatedAt')
				.timestampTimezone(3)
				.notNull.comment('Creation timestamp for the last indexed observation-log row'),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_memory_entry_cursors');
		await dropTable('agents_memory_entry_locks');
		await dropTable('agents_memory_entry_sources');
		await dropTable('agents_memory_entries');
	}
}
