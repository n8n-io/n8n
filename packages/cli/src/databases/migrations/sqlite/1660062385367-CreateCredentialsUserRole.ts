import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateCredentialsUserRole1660062385367 implements MigrationInterface {
	name = 'CreateCredentialsUserRole1660062385367';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			INSERT INTO "${tablePrefix}role" (name, scope)
			VALUES ("user", "credential")
			ON CONFLICT DO NOTHING;
		`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			DELETE FROM "${tablePrefix}role" WHERE name='user' AND scope='credential';
		`);
	}
}
