import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddMfaColumns1690000000030 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'user',
			[
				column('mfaEnabled').bool.notNull.default(false),
				column('mfaSecret').text,
				column('mfaRecoveryCodes').text,
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user', ['mfaEnabled', 'mfaSecret', 'mfaRecoveryCodes'], {
			recreatesOnSqlite: true,
		});
	}
}
