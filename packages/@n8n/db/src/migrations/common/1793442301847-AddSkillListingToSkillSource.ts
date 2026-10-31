import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SOURCE_TABLE = 'skill_source';

/** The new columns, with the types that the DSL gives on each database, and their Postgres comment. */
const columns = [
	{
		name: 'listedRevision',
		postgres: 'varchar(255)',
		sqlite: 'varchar(255)',
		comment: 'Source revision of the last skill listing, e.g. a commit SHA. NULL before the first',
	},
	{
		name: 'listedRefKeys',
		postgres: 'json',
		sqlite: 'text',
		comment: 'Keys of the remote refs in the last skill listing. NULL before the first listing',
	},
	{
		name: 'listedAt',
		postgres: 'timestamptz(3)',
		sqlite: 'datetime',
		comment: 'When n8n read the last skill listing. NULL before the first listing',
	},
	{
		name: 'seenRefKeys',
		postgres: 'json',
		sqlite: 'text',
		comment:
			'Keys of the remote refs that the user last saw in the import picker. Other refs count as new skills',
	},
] as const;

/**
 * The skill listing of a source, so the skills page can show the skills that a source has
 * gained since the user last saw its import picker. It is separate from `probeCursor`, which
 * the update check owns.
 */
export class AddSkillListingToSkillSource1793442301847 implements ReversibleMigration {
	// Raw ALTER TABLE: the DSL addColumns recreates the table on SQLite, and skill_source_link
	// has a foreign key to skill_source with ON DELETE CASCADE.
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName(SOURCE_TABLE);
		for (const { name, postgres, sqlite, comment } of columns) {
			const column = escape.columnName(name);
			await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${isPostgres ? postgres : sqlite}`);
			if (isPostgres) await runQuery(`COMMENT ON COLUMN ${table}.${column} IS '${comment}'`);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		const table = escape.tableName(SOURCE_TABLE);
		for (const { name } of [...columns].reverse()) {
			await runQuery(`ALTER TABLE ${table} DROP COLUMN ${escape.columnName(name)}`);
		}
	}
}
