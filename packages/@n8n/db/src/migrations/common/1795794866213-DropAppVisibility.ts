import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Apps are visible only to the members of their project, so the `visibility` column has no use.
 *
 * This migration drops the column in the same release that stops using it. Usually we drop a
 * column one release later. The apps module is experimental and opt-in (`N8N_ENABLED_MODULES`),
 * and it is not rolled out yet, so no production instance reads this column.
 */
export class DropAppVisibility1795794866213 implements ReversibleMigration {
	async up({ schemaBuilder: { dropEnumCheck, dropColumns } }: MigrationContext) {
		// On SQLite, the table rebuild keeps the CHECK, so remove it before the column.
		await dropEnumCheck('app', 'visibility', { recreatesOnSqlite: true });
		await dropColumns('app', ['visibility'], { recreatesOnSqlite: true });
	}

	/** Restores the column. Every app gets `project`, because `up` discarded the stored values. */
	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'app',
			[
				column('visibility')
					.varchar(16)
					.notNull.default("'project'")
					.withEnumCheck(['project', 'instance'])
					.comment('App access: project members or instance users'),
			],
			{ recreatesOnSqlite: true },
		);
	}
}
