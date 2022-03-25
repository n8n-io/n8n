import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuid } from 'uuid';
import config = require('../../../../config');
import {
	loadSurveyFromDisk,
	logMigrationEnd,
	logMigrationStart,
} from '../../utils/migrationHelpers';

export class CommunityNodes1648135167001 implements MigrationInterface {
	name = 'CommunityNodes1648135167001';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}installed_packages" (` +
				`"packageName"	char(214) NOT NULL,` +
				`"installedVersion"	char(50) NOT NULL,` +
				`"createdAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')',` +
				`"updatedAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')',` +
				`PRIMARY KEY("packageName")` +
			`);`
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}installed_nodes" (` +
				`"name"	char(200) NOT NULL,` +
				`"type"	char(200) NOT NULL,` +
				`"latestVersion"	INTEGER DEFAULT 1,` +
				`"package"	char(214) NOT NULL,` +
				`PRIMARY KEY("name"),` +
				`FOREIGN KEY("package") REFERENCES "${tablePrefix}installed_packages"("packageName") ON DELETE CASCADE ON UPDATE CASCADE` +
			`);`
		);
		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_nodes"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_packages"`);
	}
}
