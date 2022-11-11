import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class AddUserSettings1652367743993 implements MigrationInterface {
	name = 'AddUserSettings1652367743993';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}user ADD COLUMN settings json`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}user ALTER COLUMN "personalizationAnswers" TYPE json USING to_jsonb("personalizationAnswers")::json;`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}user DROP COLUMN settings`);
	}
}
