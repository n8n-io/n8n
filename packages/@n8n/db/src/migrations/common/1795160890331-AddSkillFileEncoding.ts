import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class AddSkillFileEncoding1795160890331 implements IrreversibleMigration {
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
}
