import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the egress_blocked_destination table backing the admin calibration
 * view. Each row is a distinct entry keyed by
 * (hostname, resolvedIp, feature, decision), upserted on each block event to
 * bump count and lastSeen. `decision` ('blocked' / 'would-block') is part of the
 * key so the log reflects what actually happened rather than the current mode.
 * Size is bounded by distinct blocked destinations, not request volume, so a hot
 * loop hitting one blocked host is a single row.
 */
export class CreateEgressBlockedDestinationTable1784000000038 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('egress_blocked_destination')
			.withColumns(
				// Empty string (not NULL) when unknown, so the tuple is always a valid PK.
				column('hostname').varchar(253).primary.notNull,
				column('resolvedIp').varchar(45).primary.notNull,
				column('feature').varchar(64).primary.notNull,
				column('decision').varchar(16).primary.notNull,
				column('count').bigint.notNull.default(0),
				column('lastSeen').timestampTimezone().notNull,
			)
			.withIndexOn('lastSeen');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('egress_blocked_destination');
	}
}
