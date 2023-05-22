import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class AddUserOTPSecret1681134145997 implements MigrationInterface {
	name = 'AddUserOTPSecret1681134145997';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		logMigrationStart(this.name);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" ADD COLUMN otpsecret varchar`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN otpsecret`);
	}
}
