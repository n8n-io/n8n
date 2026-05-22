import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OBSERVATION_MARKERS = ['critical', 'important', 'info', 'completion'];
const OBSERVATION_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_TASK_KINDS = ['observer', 'reflector'];

const table = {
	observations: 'instance_ai_observations',
	observationCursors: 'instance_ai_observation_cursors',
	observationLocks: 'instance_ai_observation_locks',
} as const;

export class CreateInstanceAiObservationTables1784000000012 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.observations)
			.withColumns(
				column('id')
					.varchar(36)
					.primary.notNull.comment('Application-generated n8n string ID, not a database UUID'),
				column('observationScopeId').uuid.notNull.comment(
					'instance_ai_threads.id source stream for this observation log',
				),
				column('marker').varchar(16).notNull.withEnumCheck(OBSERVATION_MARKERS),
				column('text').text.notNull,
				column('parentId').varchar(36),
				column('tokenCount').int.notNull.default(0),
				column('status').varchar(16).notNull.withEnumCheck(OBSERVATION_STATUSES),
				column('supersededBy').varchar(36),
			)
			.withIndexOn(['observationScopeId', 'status'])
			.withIndexOn('parentId')
			.withIndexOn('supersededBy')
			.withForeignKey('observationScopeId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('parentId', {
				tableName: table.observations,
				columnName: 'id',
			})
			.withForeignKey('supersededBy', {
				tableName: table.observations,
				columnName: 'id',
			}).withTimestamps;

		await createTable(table.observationCursors)
			.withColumns(
				column('observationScopeId').uuid.notNull.primary.comment(
					'instance_ai_threads.id source stream checkpointed by this cursor',
				),
				column('lastObservedMessageId').varchar(36).notNull,
				column('lastObservedAt').timestampTimezone(3).notNull,
			)
			.withForeignKey('observationScopeId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.observationLocks)
			.withColumns(
				column('observationScopeId').uuid.notNull.primary.comment(
					'instance_ai_threads.id source stream locked for observation tasks',
				),
				column('taskKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_TASK_KINDS),
				column('holderId')
					.varchar(64)
					.notNull.comment('Ephemeral background-task lock owner token, not a user ID'),
				column('heldUntil').timestampTimezone(3).notNull,
			)
			.withForeignKey('observationScopeId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.observationLocks);
		await dropTable(table.observationCursors);
		await dropTable(table.observations);
	}
}
