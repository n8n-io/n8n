import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class AddMfaColumns1677108582944 implements MigrationInterface {
	name = 'AddMfaColumns1677108582944';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaEnabled\` boolean DEFAULT false`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaSecret\` TEXT DEFAULT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaRecoveryCodes\` TEXT DEFAULT NULL`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaEnabled\``);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaSecret\``);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaRecoveryCodes\``);
	}
}
