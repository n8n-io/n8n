import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'app';

export class AddBindingsToApp1788884672990 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			table,
			[
				column('bindings')
					.json.notNull.default("'[]'")
					.comment('Resources the served app may call through its runtime API'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['bindings'], { recreatesOnSqlite: true });
	}
}
