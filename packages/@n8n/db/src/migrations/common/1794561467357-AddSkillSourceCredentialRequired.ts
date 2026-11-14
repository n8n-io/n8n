import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillSourceCredentialRequired1794561467357 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('skill_source');
		const required = escape.columnName('credentialRequired');
		// Raw ALTER keeps the source links intact on SQLite.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${required} boolean NOT NULL DEFAULT false`);
		await runQuery(
			`UPDATE ${table} SET ${required} = true WHERE ${escape.columnName('credentialId')} IS NOT NULL`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${required} IS 'True when the source requires a credential, also after that credential is deleted'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source')} DROP COLUMN ${escape.columnName('credentialRequired')}`,
		);
	}
}
