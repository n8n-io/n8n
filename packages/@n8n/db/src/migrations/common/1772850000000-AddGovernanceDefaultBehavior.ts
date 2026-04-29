import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddGovernanceDefaultBehavior1772850000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column },
		runQuery,
		escape,
		tablePrefix,
		isSqlite,
	}: MigrationContext) {
		const projectTableLiteral = `${tablePrefix}project`;
		const settingsTable = escape.tableName('settings');

		const columnExists = isSqlite
			? await runQuery<Array<{ name: string }>>(
					`SELECT name FROM pragma_table_info('${projectTableLiteral}') WHERE name = 'governanceDefaultBehavior'`,
				).then((rows) => rows.length > 0)
			: await runQuery<Array<{ column_name: string }>>(
					`SELECT column_name FROM information_schema.columns WHERE table_name = '${projectTableLiteral}' AND column_name = 'governanceDefaultBehavior' AND table_schema = current_schema()`,
				).then((rows) => rows.length > 0);

		if (!columnExists) {
			await addColumns('project', [
				column('governanceDefaultBehavior').varchar(10).withEnumCheck(['allow', 'block']),
			]);
		}

		await runQuery(
			`INSERT INTO ${settingsTable} (${escape.columnName('key')}, ${escape.columnName('value')}, ${escape.columnName('loadOnStartup')}) VALUES ('governance.defaultBehavior', '"allow"', true) ON CONFLICT (${escape.columnName('key')}) DO NOTHING`,
		);
	}

	async down({ schemaBuilder: { dropColumns }, runQuery, escape }: MigrationContext) {
		const settingsTable = escape.tableName('settings');
		await dropColumns('project', ['governanceDefaultBehavior']);
		await runQuery(
			`DELETE FROM ${settingsTable} WHERE ${escape.columnName('key')} = 'governance.defaultBehavior'`,
		);
	}
}
