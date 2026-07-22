import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class ChangeInstalledNodeVersionType1784716360735 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const installedNodes = escape.tableName('installed_nodes');
		const installedNodesTemporary = escape.tableName('installed_nodes_temporary');
		const installedPackages = escape.tableName('installed_packages');

		await runQuery(`
			CREATE TABLE ${installedNodesTemporary} (
				${escape.columnName('name')} char(200) NOT NULL,
				${escape.columnName('type')} char(200) NOT NULL,
				${escape.columnName('latestVersion')} REAL DEFAULT 1,
				${escape.columnName('package')} char(214) NOT NULL,
				PRIMARY KEY (${escape.columnName('name')}),
				FOREIGN KEY (${escape.columnName('package')}) REFERENCES ${installedPackages} (${escape.columnName('packageName')}) ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);

		await runQuery(`
			INSERT INTO ${installedNodesTemporary} (
				${escape.columnName('name')},
				${escape.columnName('type')},
				${escape.columnName('latestVersion')},
				${escape.columnName('package')}
			)
			SELECT
				${escape.columnName('name')},
				${escape.columnName('type')},
				${escape.columnName('latestVersion')},
				${escape.columnName('package')}
			FROM ${installedNodes}
		`);

		await runQuery(`DROP TABLE ${installedNodes}`);
		await runQuery(`ALTER TABLE ${installedNodesTemporary} RENAME TO ${installedNodes}`);
	}
}
