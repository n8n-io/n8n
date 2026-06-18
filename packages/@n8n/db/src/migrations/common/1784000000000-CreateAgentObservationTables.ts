import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the three sibling tables for observational memory:
 *
 * - `agents_observations`: append-only observation log keyed by `(scopeKind,
 *   scopeId)` and ordered by `(createdAt, id)`. Consumers define `kind`;
 *   payload is JSON. The compactor hard-deletes rows it folds into thread
 *   working memory.
 * - `agents_observation_cursors`: per-scope keyset cursor
 *   `(lastObservedAt, lastObservedMessageId)` that advances every observe
 *   cycle.
 * - `agents_observation_locks`: per-scope advisory lock with TTL so two
 *   observers on the same scope can't stomp each other.
 *
 * `scopeKind` is polymorphic (`thread` / `resource` / `agent`); columns are in
 * place so future scopes are a behavioural change, not a schema migration. No
 * FK on `scopeId` for that reason — it can reference different parent tables
 * depending on `scopeKind`.
 */
export class CreateAgentObservationTables1784000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
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
			column('lastObservedAt').timestamp(3).notNull,
		).withTimestamps;

		await createTable('agents_observation_locks').withColumns(
			column('scopeKind')
				.varchar(20)
				.notNull.primary.withEnumCheck(['thread', 'resource', 'agent']),
			column('scopeId').varchar(255).notNull.primary,
			column('holderId').varchar(64).notNull,
			column('heldUntil').timestamp(3).notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_observation_locks');
		await dropTable('agents_observation_cursors');
		await dropTable('agents_observations');
	}
}
