import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddGovernanceDefaultBehavior1772850000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column },
		runQuery,
		escape,
		isSqlite,
	}: MigrationContext) {
		const tableName = escape.tableName('project');
		const columnName = escape.columnName('governanceDefaultBehavior');

		const columnExists = isSqlite
			? await runQuery<Array<{ name: string }>>(
					`SELECT name FROM pragma_table_info('project') WHERE name = 'governanceDefaultBehavior'`,
				).then((rows) => rows.length > 0)
			: await runQuery<Array<{ column_name: string }>>(
					`SELECT column_name FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'governanceDefaultBehavior'`,
				).then((rows) => rows.length > 0);

		if (!columnExists) {
			await addColumns('project', [
				column('governanceDefaultBehavior').varchar(10).withEnumCheck(['allow', 'block']),
			]);
		}

		await runQuery(
			`INSERT INTO settings ("key", "value", "loadOnStartup") VALUES ('governance.defaultBehavior', '"allow"', true) ON CONFLICT ("key") DO NOTHING`,
		);
	}

	async down({ schemaBuilder: { dropColumns }, runQuery }: MigrationContext) {
		await dropColumns('project', ['governanceDefaultBehavior']);
		await runQuery(`DELETE FROM settings WHERE "key" = 'governance.defaultBehavior'`);
	}
}
