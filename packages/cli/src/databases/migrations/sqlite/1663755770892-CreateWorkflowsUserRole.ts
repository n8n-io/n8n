import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class CreateWorkflowsEditorRole1663755770892 implements MigrationInterface {
	name = 'CreateWorkflowsEditorRole1663755770892';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			INSERT INTO "${tablePrefix}role" (name, scope)
			VALUES ("editor", "workflow")
			ON CONFLICT DO NOTHING;
		`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			DELETE FROM "${tablePrefix}role" WHERE name='user' AND scope='workflow';
		`);
	}
}
