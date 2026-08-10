import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'trusted_key_source';
const POLICY_COLUMN = 'policy';

/**
 * SQLite variant of the common migration of the same name — see it for why
 * `policy` is a separate column.
 */
export class AddPolicyToTrustedKeySource1786022834327 implements ReversibleMigration {
	// trusted_key has an inbound ON DELETE CASCADE FK to trusted_key_source, so
	// recreating the table on SQLite would fire that cascade and wipe keys.
	withFKsDisabled = true as const;

	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE, [column(POLICY_COLUMN).text], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE, [POLICY_COLUMN], { recreatesOnSqlite: true });
	}
}
