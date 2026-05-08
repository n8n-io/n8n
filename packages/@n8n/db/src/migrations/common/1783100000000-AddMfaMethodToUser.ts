import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddMfaMethodToUser1783100000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
		await addColumns('user', [column('mfaMethod').varchar(20)]);

		const userTable = escape.tableName('user');
		const credentialTable = escape.tableName('webauthn_credential');
		const mfaMethodColumn = escape.columnName('mfaMethod');
		const mfaEnabledColumn = escape.columnName('mfaEnabled');
		const userIdColumn = escape.columnName('userId');

		// Users with a registered webauthn credential get 'passkey' (best-effort default
		// for the dev-branch state where webauthn could co-exist with TOTP secrets).
		// Users on a security key can switch via the picker after upgrade.
		await runQuery(
			`UPDATE ${userTable}
			 SET ${mfaMethodColumn} = 'passkey'
			 WHERE ${mfaEnabledColumn} = true
			   AND id IN (SELECT DISTINCT ${userIdColumn} FROM ${credentialTable})`,
		);

		// Remaining mfaEnabled users have TOTP only.
		await runQuery(
			`UPDATE ${userTable}
			 SET ${mfaMethodColumn} = 'totp'
			 WHERE ${mfaEnabledColumn} = true
			   AND ${mfaMethodColumn} IS NULL`,
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user', ['mfaMethod']);
	}
}
