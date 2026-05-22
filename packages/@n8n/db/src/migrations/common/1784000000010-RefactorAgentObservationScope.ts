import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OBSERVATION_MARKERS = ['critical', 'important', 'info', 'completion'];
const OBSERVATION_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_TASK_KINDS = ['observer', 'reflector'];
const MEMORY_ENTRY_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];

export class RefactorAgentObservationScope1784000000010 implements ReversibleMigration {
	async up({
		escape,
		isPostgres,
		runQuery,
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await this.dropDerivedMemoryTables(runQuery, escape, isPostgres);
		await this.createObservationLogTables(createTable, column);
		await this.createEpisodicMemoryTables(createTable, column, 'agent-bound');
	}

	async down({
		escape,
		isPostgres,
		runQuery,
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await this.dropDerivedMemoryTables(runQuery, escape, isPostgres);
		await this.createLegacyObservationLogTables(createTable, column);
		await this.createEpisodicMemoryTables(createTable, column, 'legacy-observation-scope');
	}

	private async dropDerivedMemoryTables(
		runQuery: MigrationContext['runQuery'],
		escape: MigrationContext['escape'],
		isPostgres: boolean,
	) {
		const cascade = isPostgres ? ' CASCADE' : '';

		await runQuery(
			`DROP TABLE IF EXISTS ${escape.tableName('agents_memory_entry_cursors')}${cascade}`,
		);
		await runQuery(
			`DROP TABLE IF EXISTS ${escape.tableName('agents_memory_entry_sources')}${cascade}`,
		);
		await runQuery(
			`DROP TABLE IF EXISTS ${escape.tableName('agents_memory_entry_locks')}${cascade}`,
		);
		await runQuery(`DROP TABLE IF EXISTS ${escape.tableName('agents_memory_entries')}${cascade}`);
		await runQuery(
			`DROP TABLE IF EXISTS ${escape.tableName('agents_observation_locks')}${cascade}`,
		);
		await runQuery(
			`DROP TABLE IF EXISTS ${escape.tableName('agents_observation_cursors')}${cascade}`,
		);
		await runQuery(`DROP TABLE IF EXISTS ${escape.tableName('agents_observations')}${cascade}`);
	}

	private async createObservationLogTables(
		createTable: MigrationContext['schemaBuilder']['createTable'],
		column: MigrationContext['schemaBuilder']['column'],
	) {
		await createTable('agents_observations')
			.withColumns(
				column('id')
					.varchar(36)
					.primary.notNull.comment('Application-generated n8n string ID, not a database UUID'),
				column('agentId').varchar(36).notNull,
				column('observationScopeId').varchar(255).notNull,
				column('marker').varchar(16).notNull.withEnumCheck(OBSERVATION_MARKERS),
				column('text').text.notNull,
				column('parentId').varchar(36),
				column('tokenCount').int.notNull.default(0),
				column('status').varchar(16).notNull.withEnumCheck(OBSERVATION_STATUSES),
				column('supersededBy').varchar(36),
			)
			.withIndexOn(['agentId', 'observationScopeId', 'status', 'createdAt', 'id'])
			.withIndexOn(['agentId', 'observationScopeId', 'createdAt', 'id'])
			.withIndexOn('parentId')
			.withIndexOn('supersededBy')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('parentId', {
				tableName: 'agents_observations',
				columnName: 'id',
			})
			.withForeignKey('supersededBy', {
				tableName: 'agents_observations',
				columnName: 'id',
			}).withTimestamps;

		await createTable('agents_observation_cursors')
			.withColumns(
				column('agentId').varchar(36).notNull.primary,
				column('observationScopeId').varchar(255).notNull.primary,
				column('lastObservedMessageId').varchar(36).notNull,
				column('lastObservedAt').timestampTimezone(3).notNull,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_observation_locks')
			.withColumns(
				column('agentId').varchar(36).notNull.primary,
				column('observationScopeId').varchar(255).notNull.primary,
				column('taskKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_TASK_KINDS),
				column('holderId')
					.varchar(64)
					.notNull.comment('Ephemeral background-task lock owner token, not a user ID'),
				column('heldUntil').timestampTimezone(3).notNull,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	private async createLegacyObservationLogTables(
		createTable: MigrationContext['schemaBuilder']['createTable'],
		column: MigrationContext['schemaBuilder']['column'],
	) {
		await createTable('agents_observations')
			.withColumns(
				column('id')
					.varchar(36)
					.primary.notNull.comment('Application-generated n8n string ID, not a database UUID'),
				column('scopeKind').varchar(20).notNull.withEnumCheck(OBSERVATION_SCOPE_KINDS),
				column('scopeId').varchar(255).notNull,
				column('marker').varchar(16).notNull.withEnumCheck(OBSERVATION_MARKERS),
				column('text').text.notNull,
				column('parentId').varchar(36),
				column('tokenCount').int.notNull.default(0),
				column('status').varchar(16).notNull.withEnumCheck(OBSERVATION_STATUSES),
				column('supersededBy').varchar(36),
			)
			.withIndexOn(['scopeKind', 'scopeId', 'status', 'createdAt', 'id'])
			.withIndexOn(['scopeKind', 'scopeId', 'createdAt', 'id'])
			.withIndexOn('parentId')
			.withIndexOn('supersededBy')
			.withForeignKey('parentId', {
				tableName: 'agents_observations',
				columnName: 'id',
			})
			.withForeignKey('supersededBy', {
				tableName: 'agents_observations',
				columnName: 'id',
			}).withTimestamps;

		await createTable('agents_observation_cursors').withColumns(
			column('scopeKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS),
			column('scopeId').varchar(255).notNull.primary,
			column('lastObservedMessageId').varchar(36).notNull,
			column('lastObservedAt').timestampTimezone(3).notNull,
		).withTimestamps;

		await createTable('agents_observation_locks').withColumns(
			column('scopeKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS),
			column('scopeId').varchar(255).notNull.primary,
			column('taskKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_TASK_KINDS),
			column('holderId')
				.varchar(64)
				.notNull.comment('Ephemeral background-task lock owner token, not a user ID'),
			column('heldUntil').timestampTimezone(3).notNull,
		).withTimestamps;
	}

	private async createEpisodicMemoryTables(
		createTable: MigrationContext['schemaBuilder']['createTable'],
		column: MigrationContext['schemaBuilder']['column'],
		cursorScope: 'agent-bound' | 'legacy-observation-scope',
	) {
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

		if (cursorScope === 'agent-bound') {
			await createTable('agents_memory_entry_cursors')
				.withColumns(
					column('agentId').varchar(36).notNull.primary,
					column('observationScopeId')
						.varchar(255)
						.notNull.primary.comment('Source observation stream indexed into episodic memory'),
					column('lastIndexedObservationId')
						.varchar(36)
						.notNull.comment('Last observation-log row indexed into episodic memory'),
					column('lastIndexedObservationCreatedAt')
						.timestampTimezone(3)
						.notNull.comment('Creation timestamp for the last indexed observation-log row'),
				)
				.withForeignKey('agentId', {
					tableName: 'agents',
					columnName: 'id',
					onDelete: 'CASCADE',
				}).withTimestamps;
			return;
		}

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
}
