import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class CreateWorkflowsUserRole1663755770893 implements MigrationInterface {
	name = 'CreateWorkflowsUserRole1663755770893';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ('user', 'workflow')
			ON CONFLICT DO NOTHING;
		`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='workflow';
		`);
	}
}
