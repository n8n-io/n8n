import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CommunityNodes1652254514001 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}installed_packages" (` +
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
			`CREATE TABLE "${tablePrefix}installed_nodes" (` +
				'"name"	char(200) NOT NULL,' +
				'"type"	char(200) NOT NULL,' +
				'"latestVersion"	INTEGER DEFAULT 1,' +
				'"package"	char(214) NOT NULL,' +
				'PRIMARY KEY("name"),' +
				`FOREIGN KEY("package") REFERENCES "${tablePrefix}installed_packages"("packageName") ON DELETE CASCADE ON UPDATE CASCADE` +
				');',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_nodes"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_packages"`);
	}
}
