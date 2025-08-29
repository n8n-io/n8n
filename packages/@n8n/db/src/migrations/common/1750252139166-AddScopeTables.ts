import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * We introduce a scope table, this will hold all scopes that we know about.
 *
 * The scope table should never be edited by users, on every startup
 * the system will make sure that all scopes that it knows about are stored
 * in here.
 *
 * ColumnName  | Type | Description
 * =================================
 * slug        | Text | Unique identifier of the scope for example: 'project:create'
 * displayName | Text | Name used to display in the UI
 * description | Text | Text describing the scope in more detail of users
 */
export class AddScopeTables1750252139166 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('scope').withColumns(
			column('slug')
				.varchar(128)
				.primary.notNull.comment('Unique identifier of the scope for example: "project:create"'),
			column('displayName').text.default(null).comment('Name used to display in the UI'),
			column('description')
				.text.default(null)
				.comment('Text describing the scope in more detail of users'),
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('scope');
	}
}
