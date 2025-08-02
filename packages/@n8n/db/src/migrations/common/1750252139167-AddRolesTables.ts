import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * We introduce roles table, this will hold all roles that we know about
 *
 * There are roles that can't be edited by users, these are marked as system-only and will
 * be managed by the system itself. On every startup, the system will ensure
 * that these roles are synchronized.
 *
 * ColumnName  | Type | Description
 * =================================
 * slug        | Text | Unique identifier of the role for example: 'global:owner'
 * displayName | Text | Name used to display in the UI
 * description | Text | Text describing the scope in more detail of users
 * roleType    | Text | Text type of role, such as 'global', 'project', etc.
 * systemRole  | Bool | Indicates if the role is managed by the system and cannot be edited by users
 *
 * For the role table there is a junction table that will hold the
 * relationships between the roles and the scopes that are associated with them.
 */

export class AddRolesTables1750252139167 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('role').withColumns(
			column('slug').varchar(128).primary.notNull,
			column('displayName').text.default(null),
			column('description').text.default(null),
			column('roleType').text.default(null),
			column('systemRole').bool.default(false).notNull,
		);

		await createTable('role_scope')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('roleSlug').varchar(128).notNull,
				column('scopeSlug').varchar(128).notNull,
			)
			.withForeignKey('roleSlug', {
				tableName: 'role',
				columnName: 'slug',
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			})
			.withForeignKey('scopeSlug', {
				tableName: 'scope',
				columnName: 'slug',
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			})
			.withIndexOn('roleSlug') // For fast lookup of all scopes for a role
			.withIndexOn('scopeSlug') // For fast lookup of which roles have access to a scope
			.withIndexOn(['roleSlug', 'scopeSlug'], true);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('role_scope');
		await dropTable('role');
	}
}
