import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillFileEncoding1795546358453 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'skill_file',
			[
				column('isBinary')
					.bool.notNull.default(false)
					.comment('Content holds Base64 instead of UTF-8 text'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ escape, runQuery, schemaBuilder: { dropColumns } }: MigrationContext) {
		// Without the flag, n8n reads Base64 as text. The binary files go, so no agent gets them.
		await runQuery(
			`DELETE FROM ${escape.tableName('skill_file')} WHERE ${escape.columnName('isBinary')} = true`,
		);
		await dropColumns('skill_file', ['isBinary'], { recreatesOnSqlite: true });
	}
}
