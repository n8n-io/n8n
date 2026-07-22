import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class ChangeInstalledNodeVersionType1784716360735 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('installed_nodes')} ALTER COLUMN ${escape.columnName('latestVersion')} TYPE DOUBLE PRECISION`,
		);
	}
}
