import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'app';

export class AddAuthModeToApp1788900000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			table,
			[
				column('authMode')
					.varchar(16)
					.notNull.default("'public'")
					.comment("Who may open the served app: 'public' or 'n8n' (signed-in instance users)"),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['authMode'], { recreatesOnSqlite: true });
	}
}
