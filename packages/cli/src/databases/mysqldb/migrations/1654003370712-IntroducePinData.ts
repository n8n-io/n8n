import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class IntroducePinData1654003370712 implements MigrationInterface {
	name = 'IntroducePinData1654003370712';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}pin_data\` (
				\`id\` int NOT NULL AUTO_INCREMENT,
				\`data\` json,
				PRIMARY KEY (\`id\`)
			) ENGINE=InnoDB`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE \`${tablePrefix}pin_data\``);
	}
}
