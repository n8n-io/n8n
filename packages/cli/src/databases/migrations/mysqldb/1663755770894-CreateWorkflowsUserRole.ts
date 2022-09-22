import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../../../config';

export class CreateWorkflowsUserRole1663755770894 implements MigrationInterface {
	name = 'CreateWorkflowsUserRole1663755770894';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ("user", "workflow")
			ON CONFLICT DO NOTHING;
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='workflow';
		`);
	}
}
