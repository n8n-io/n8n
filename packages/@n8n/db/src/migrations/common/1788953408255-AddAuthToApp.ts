import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';

export class AddAuthToApp1788953408255 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			APP_TABLE,
			[
				column('auth')
					.varchar(16)
					.notNull.default("'public'")
					.withEnumCheck(['public', 'n8n'])
					.comment(
						'Who may open the App: anyone (public) or a signed-in user of this instance (n8n)',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns, dropEnumCheck } }: MigrationContext) {
		await dropEnumCheck(APP_TABLE, 'auth', { recreatesOnSqlite: true });
		await dropColumns(APP_TABLE, ['auth'], { recreatesOnSqlite: true });
	}
}
