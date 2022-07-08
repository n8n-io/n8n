import { MigrationInterface, QueryRunner } from 'typeorm';
import config = require('../../../../config');
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class LowerCaseUserEmail1648740597343 implements MigrationInterface {
	name = 'LowerCaseUserEmail1648740597343';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`
			UPDATE "${tablePrefix}user"
			SET email = LOWER(email);
		`);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
