import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentPendingChannelSetup1792152456800 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		// ALTER preserves the Agent's dependent rows on SQLite.
		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} ADD COLUMN ${escape.columnName('pendingChannelSetup')} ${isPostgres ? 'JSON' : 'TEXT'} DEFAULT NULL`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('agents')}.${escape.columnName('pendingChannelSetup')} IS 'Requested channels that require destination setup'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('pendingChannelSetup')}`,
		);
	}
}
