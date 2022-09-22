import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../../../config';

export class CreateWorkflowsUserRole1663755770893 implements MigrationInterface {
	name = 'CreateWorkflowsUserRole1663755770893';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ('user', 'workflow')
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
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='workflow';
		`);
	}
}
