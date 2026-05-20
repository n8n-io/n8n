import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];
const OBSERVATION_MARKERS = ['critical', 'important', 'info', 'completion'];
const OBSERVATION_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_TASK_KINDS = ['observer', 'reflector'];

/**
 * Adds observation-log tables for Instance AI observational memory and drops the
 * unused legacy `instance_ai_observational_memory` table (Mastra schema, never wired).
 */
export class CreateInstanceAiObservationTables1784000000009 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await dropTable('instance_ai_observational_memory');

		await createTable('instance_ai_observations')
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
				tableName: 'instance_ai_observations',
				columnName: 'id',
			})
			.withForeignKey('supersededBy', {
				tableName: 'instance_ai_observations',
				columnName: 'id',
			}).withTimestamps;

		await createTable('instance_ai_observation_cursors').withColumns(
			column('scopeKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS),
			column('scopeId').varchar(255).notNull.primary,
			column('lastObservedMessageId').varchar(36).notNull,
			column('lastObservedAt').timestampTimezone(3).notNull,
		).withTimestamps;

		await createTable('instance_ai_observation_locks').withColumns(
			column('scopeKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS),
			column('scopeId').varchar(255).notNull.primary,
			column('taskKind').varchar(20).notNull.primary.withEnumCheck(OBSERVATION_TASK_KINDS),
			column('holderId')
				.varchar(64)
				.notNull.comment('Ephemeral background-task lock owner token, not a user ID'),
			column('heldUntil').timestampTimezone(3).notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await dropTable('instance_ai_observation_locks');
		await dropTable('instance_ai_observation_cursors');
		await dropTable('instance_ai_observations');

		await createTable('instance_ai_observational_memory')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('lookupKey').varchar(255).notNull,
				column('scope').varchar(16).notNull,
				column('threadId').uuid,
				column('resourceId').varchar(255).notNull,
				column('activeObservations').text.default("''").notNull,
				column('originType').varchar(32).notNull,
				column('config').text.notNull,
				column('generationCount').int.default(0).notNull,
				column('lastObservedAt').timestampTimezone(),
				column('pendingMessageTokens').int.default(0).notNull,
				column('totalTokensObserved').int.default(0).notNull,
				column('observationTokenCount').int.default(0).notNull,
				column('isObserving').bool.default(false).notNull,
				column('isReflecting').bool.default(false).notNull,
				column('observedMessageIds').json,
				column('observedTimezone').varchar(),
				column('bufferedObservations').text,
				column('bufferedObservationTokens').int,
				column('bufferedMessageIds').json,
				column('bufferedReflection').text,
				column('bufferedReflectionTokens').int,
				column('bufferedReflectionInputTokens').int,
				column('reflectedObservationLineCount').int,
				column('bufferedObservationChunks').json,
				column('isBufferingObservation').bool.default(false).notNull,
				column('isBufferingReflection').bool.default(false).notNull,
				column('lastBufferedAtTokens').int.default(0).notNull,
				column('lastBufferedAtTime').timestampTimezone(),
				column('metadata').json,
			)
			.withIndexOn('lookupKey')
			.withIndexOn(['scope', 'threadId', 'resourceId'], true)
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}
}
