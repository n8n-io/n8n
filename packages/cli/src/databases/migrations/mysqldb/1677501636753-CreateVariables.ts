import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart, getTablePrefix } from '@db/utils/migrationHelpers';
import config from '@/config';

export class CreateVariables1677501636753 implements MigrationInterface {
	name = 'CreateVariables1677501636753';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			CREATE TABLE ${tablePrefix}variables (
				id int(11) auto_increment NOT NULL PRIMARY KEY,
				\`key\` VARCHAR(50) NOT NULL,
				\`type\` VARCHAR(50) DEFAULT 'string' NOT NULL,
				value VARCHAR(255) NULL,
				UNIQUE (\`key\`)
			)
			ENGINE=InnoDB;
		`);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`DROP TABLE ${tablePrefix}variables;`);

		logMigrationEnd(this.name);
	}
}
