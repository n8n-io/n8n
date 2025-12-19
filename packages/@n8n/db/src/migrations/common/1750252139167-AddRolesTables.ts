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
	async up({
		schemaBuilder: { createTable, column, createIndex },
		queryRunner,
		tablePrefix,
		dbType,
	}: MigrationContext) {
		await createTable('role').withColumns(
			column('slug')
				.varchar(128)
				.primary.notNull.comment('Unique identifier of the role for example: "global:owner"'),
			column('displayName').text.default(null).comment('Name used to display in the UI'),
			column('description')
				.text.default(null)
				.comment('Text describing the scope in more detail of users'),
			column('roleType')
				.text.default(null)
				.comment('Type of the role, e.g., global, project, or workflow'),
			column('systemRole')
				.bool.default(false)
				.notNull.comment('Indicates if the role is managed by the system and cannot be edited'),
		);

		// MYSQL
		if (dbType === 'postgresdb' || dbType === 'sqlite') {
			// POSTGRES
			await queryRunner.query(
				`CREATE TABLE ${tablePrefix}role_scope (
						"roleSlug" VARCHAR(128) NOT NULL,
						"scopeSlug" VARCHAR(128) NOT NULL,
						CONSTRAINT "PK_${tablePrefix}role_scope" PRIMARY KEY ("roleSlug", "scopeSlug"),
						CONSTRAINT "FK_${tablePrefix}role" FOREIGN KEY ("roleSlug") REFERENCES ${tablePrefix}role ("slug") ON DELETE CASCADE ON UPDATE CASCADE,
						CONSTRAINT "FK_${tablePrefix}scope" FOREIGN KEY ("scopeSlug") REFERENCES "${tablePrefix}scope" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
					);`,
			);
		} else {
			// MYSQL
			await queryRunner.query(
				`CREATE TABLE ${tablePrefix}role_scope (
					\`roleSlug\` VARCHAR(128) NOT NULL,
					\`scopeSlug\` VARCHAR(128) NOT NULL,
					FOREIGN KEY (\`scopeSlug\`) REFERENCES ${tablePrefix}scope (\`slug\`) ON DELETE CASCADE ON UPDATE CASCADE,
					FOREIGN KEY (\`roleSlug\`) REFERENCES ${tablePrefix}role (\`slug\`) ON DELETE CASCADE ON UPDATE CASCADE,
					PRIMARY KEY (\`roleSlug\`, \`scopeSlug\`)
				) ENGINE=InnoDB;`,
			);
		}

		await createIndex('role_scope', ['scopeSlug']);
		/*
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
			.withIndexOn('scopeSlug') // For fast lookup of which roles have access to a scope
			.withIndexOn(['roleSlug', 'scopeSlug'], true); */
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('role_scope');
		await dropTable('role');
	}
}
