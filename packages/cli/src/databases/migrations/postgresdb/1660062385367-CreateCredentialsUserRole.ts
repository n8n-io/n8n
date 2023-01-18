import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class CreateCredentialsUserRole1660062385367 implements MigrationInterface {
	name = 'CreateCredentialsUserRole1660062385367';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ('user', 'credential')
			ON CONFLICT DO NOTHING;
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='credential';
		`);
	}
}
