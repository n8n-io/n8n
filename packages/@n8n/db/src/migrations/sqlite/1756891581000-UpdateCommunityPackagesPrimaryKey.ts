import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class UpdateCommunityPackagesPrimaryKey1756891581000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Disable foreign key constraints to avoid cascade issues during migration
		await queryRunner.query('PRAGMA foreign_keys = OFF;');

		try {
			// Create new tables with updated structure
			await queryRunner.query(
				`CREATE TABLE "${tablePrefix}installed_packages_new" (` +
					'"packageName"	char(214) NOT NULL,' +
					'"installedVersion"	char(50) NOT NULL,' +
					'"authorName"	char(70) NULL,' +
					'"authorEmail"	char(70) NULL,' +
					"\"createdAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
					"\"updatedAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
					'PRIMARY KEY("packageName", "installedVersion")' +
					');',
			);

			await queryRunner.query(
				`CREATE TABLE "${tablePrefix}installed_nodes_new" (` +
					'"name"	char(200) NOT NULL,' +
					'"type"	char(200) NOT NULL,' +
					'"latestVersion"	INTEGER DEFAULT 1,' +
					'"packageName"	char(214) NOT NULL,' +
					'"packageVersion"	char(50) NOT NULL,' +
					'PRIMARY KEY("type", "packageVersion"),' +
					`FOREIGN KEY("packageName", "packageVersion") REFERENCES "${tablePrefix}installed_packages_new"("packageName", "installedVersion") ON DELETE CASCADE ON UPDATE CASCADE` +
					');',
			);

			// Copy data from old tables to new tables
			await queryRunner.query(
				`INSERT INTO "${tablePrefix}installed_packages_new" ` +
					'("packageName", "installedVersion", "authorName", "authorEmail", "createdAt", "updatedAt") ' +
					'SELECT "packageName", "installedVersion", "authorName", "authorEmail", "createdAt", "updatedAt" ' +
					`FROM "${tablePrefix}installed_packages";`,
			);

			await queryRunner.query(
				`INSERT INTO "${tablePrefix}installed_nodes_new" ` +
					'("name", "type", "latestVersion", "packageName", "packageVersion") ' +
					'SELECT n."name", n."type", n."latestVersion", p."packageName", p."installedVersion" ' +
					`FROM "${tablePrefix}installed_nodes" n ` +
					`INNER JOIN "${tablePrefix}installed_packages" p ON n."package" = p."packageName";`,
			);

			// Drop old tables
			await queryRunner.query(`DROP TABLE "${tablePrefix}installed_nodes"`);
			await queryRunner.query(`DROP TABLE "${tablePrefix}installed_packages"`);

			// Rename new tables to original names
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}installed_packages_new" RENAME TO "${tablePrefix}installed_packages"`,
			);
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}installed_nodes_new" RENAME TO "${tablePrefix}installed_nodes"`,
			);
		} finally {
			// Re-enable foreign key constraints
			await queryRunner.query('PRAGMA foreign_keys = ON;');
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Disable foreign key constraints to avoid cascade issues during migration
		await queryRunner.query('PRAGMA foreign_keys = OFF;');

		try {
			// Create old structure tables
			await queryRunner.query(
				`CREATE TABLE "${tablePrefix}installed_packages_old" (` +
					'"packageName"	char(214) NOT NULL,' +
					'"installedVersion"	char(50) NOT NULL,' +
					'"authorName"	char(70) NULL,' +
					'"authorEmail"	char(70) NULL,' +
					"\"createdAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
					"\"updatedAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
					'PRIMARY KEY("packageName")' +
					');',
			);

			await queryRunner.query(
				`CREATE TABLE "${tablePrefix}installed_nodes_old" (` +
					'"name"	char(200) NOT NULL,' +
					'"type"	char(200) NOT NULL,' +
					'"latestVersion"	INTEGER DEFAULT 1,' +
					'"package"	char(214) NOT NULL,' +
					'PRIMARY KEY("name"),' +
					`FOREIGN KEY("package") REFERENCES "${tablePrefix}installed_packages_old"("packageName") ON DELETE CASCADE ON UPDATE CASCADE` +
					');',
			);

			// Copy data back (this will lose data if there are multiple versions of the same package)
			await queryRunner.query(
				`INSERT INTO "${tablePrefix}installed_packages_old" ` +
					'("packageName", "installedVersion", "authorName", "authorEmail", "createdAt", "updatedAt") ' +
					'SELECT DISTINCT "packageName", "installedVersion", "authorName", "authorEmail", "createdAt", "updatedAt" ' +
					`FROM "${tablePrefix}installed_packages" ` +
					'WHERE ("packageName", "installedVersion") IN (' +
					'SELECT "packageName", MAX("installedVersion") ' +
					`FROM "${tablePrefix}installed_packages" ` +
					'GROUP BY "packageName");',
			);

			await queryRunner.query(
				`INSERT INTO "${tablePrefix}installed_nodes_old" ` +
					'("name", "type", "latestVersion", "package") ' +
					'SELECT n."name", n."type", n."latestVersion", n."packageName" ' +
					`FROM "${tablePrefix}installed_nodes" n ` +
					`INNER JOIN "${tablePrefix}installed_packages_old" p ON n."packageName" = p."packageName";`,
			);

			// Drop new tables
			await queryRunner.query(`DROP TABLE "${tablePrefix}installed_nodes"`);
			await queryRunner.query(`DROP TABLE "${tablePrefix}installed_packages"`);

			// Rename old structure tables to original names
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}installed_packages_old" RENAME TO "${tablePrefix}installed_packages"`,
			);
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}installed_nodes_old" RENAME TO "${tablePrefix}installed_nodes"`,
			);
		} finally {
			// Re-enable foreign key constraints
			await queryRunner.query('PRAGMA foreign_keys = ON;');
		}
	}
}
