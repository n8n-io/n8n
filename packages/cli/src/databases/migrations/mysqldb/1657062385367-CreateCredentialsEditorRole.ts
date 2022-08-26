import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../../../config';

export class CreateCredentialsEditorRole1657062385367 implements MigrationInterface {
	name = 'CreateCredentialsEditorRole1657062385367';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ("user", "credential");
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='credential';
		`);
	}
}
