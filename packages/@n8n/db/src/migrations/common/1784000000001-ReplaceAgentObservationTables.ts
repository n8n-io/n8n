import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];
const OBSERVATION_MARKERS = ['critical', 'important', 'info', 'completion'];
const OBSERVATION_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_TASK_KINDS = ['observer', 'reflector'];

/**
 * Replaces the first observational-memory schema with the observation-log
 * schema. The earlier schema has already shipped on master, so this migration
 * intentionally drops its queued observation rows instead of editing the
 * original migration.
 */
export class ReplaceAgentObservationTables1784000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await this.dropObservationTables(dropTable);
		await this.createObservationLogTables(createTable, column);
	}

	async down({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await this.dropObservationTables(dropTable);
		await this.createLegacyObservationTables(createTable, column);
	}

	private async dropObservationTables(dropTable: MigrationContext['schemaBuilder']['dropTable']) {
		await dropTable('agents_observation_locks');
		await dropTable('agents_observation_cursors');
		await dropTable('agents_observations');
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

	private async createLegacyObservationTables(
		createTable: MigrationContext['schemaBuilder']['createTable'],
		column: MigrationContext['schemaBuilder']['column'],
	) {
		await createTable('agents_observations')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('scopeKind').varchar(20).notNull.withEnumCheck(['thread', 'resource', 'agent']),
				column('scopeId').varchar(255).notNull,
				column('kind').varchar(64).notNull,
				column('payload').json.notNull,
				column('durationMs').bigint,
				column('schemaVersion').int.notNull,
			)
			.withIndexOn(['scopeKind', 'scopeId', 'kind', 'createdAt'])
			.withIndexOn(['scopeKind', 'scopeId', 'createdAt', 'id']).withTimestamps;

		await createTable('agents_observation_cursors').withColumns(
			column('scopeKind')
				.varchar(20)
				.notNull.primary.withEnumCheck(['thread', 'resource', 'agent']),
			column('scopeId').varchar(255).notNull.primary,
			column('lastObservedMessageId').varchar(36).notNull,
			column('lastObservedAt').timestampTimezone(3).notNull,
		).withTimestamps;

		await createTable('agents_observation_locks').withColumns(
			column('scopeKind')
				.varchar(20)
				.notNull.primary.withEnumCheck(['thread', 'resource', 'agent']),
			column('scopeId').varchar(255).notNull.primary,
			column('holderId').varchar(64).notNull,
			column('heldUntil').timestampTimezone(3).notNull,
		).withTimestamps;
	}
}
