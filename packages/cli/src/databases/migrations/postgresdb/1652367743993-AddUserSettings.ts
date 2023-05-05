import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class AddUserSettings1652367743993 implements MigrationInterface {
	name = 'AddUserSettings1652367743993';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" ADD COLUMN settings json`);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}user" ALTER COLUMN "personalizationAnswers" TYPE json USING to_jsonb("personalizationAnswers")::json;`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN settings`);
	}
}
