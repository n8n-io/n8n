import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillSourceHealth1794488303980 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const source = escape.tableName('skill_source');
		const link = escape.tableName('skill_source_link');
		const required = escape.columnName('requiresCredential');
		const version = escape.columnName('credentialVersion');
		const unavailable = escape.columnName('sourceUnavailable');
		// Native ALTER preserves the incoming foreign keys on SQLite.
		await runQuery(`ALTER TABLE ${source} ADD COLUMN ${required} BOOLEAN NOT NULL DEFAULT false`);
		await runQuery(`ALTER TABLE ${source} ADD COLUMN ${version} INTEGER NOT NULL DEFAULT 0`);
		await runQuery(`ALTER TABLE ${link} ADD COLUMN ${unavailable} BOOLEAN NOT NULL DEFAULT false`);
		await runQuery(
			`UPDATE ${source} SET ${required} = true WHERE ${escape.columnName('credentialId')} IS NOT NULL`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${source}.${required} IS 'True when the source requires a credential, including after credential deletion'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${source}.${version} IS 'Credential selection revision used to reject older check results'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${link}.${unavailable} IS 'True when the latest source check could not find this skill folder'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source_link')} DROP COLUMN ${escape.columnName('sourceUnavailable')}`,
		);
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source')} DROP COLUMN ${escape.columnName('credentialVersion')}`,
		);
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source')} DROP COLUMN ${escape.columnName('requiresCredential')}`,
		);
	}
}
