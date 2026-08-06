import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'trusted_key_source';
const POLICY_COLUMN = 'policy';

/**
 * Adds an admin-owned `policy` column, holding the overrides an admin sets on
 * a trusted key source (accepted inbound audiences, subject claim, ...).
 *
 * Deliberately a separate column rather than more keys in `config`: `config`
 * is rewritten wholesale from the OIDC discovery document on every startup
 * (`registerSsoDerivedSource`) and from `N8N_TRUSTED_KEYS` on every sync, so
 * anything stored there is not the admin's to keep. Splitting them makes the
 * self-heal non-destructive by construction — it writes a column that holds
 * no administered state — instead of by remembering to merge.
 */
export class AddPolicyToTrustedKeySource1786022834327 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE, [column(POLICY_COLUMN).text], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE, [POLICY_COLUMN], { recreatesOnSqlite: true });
	}
}
