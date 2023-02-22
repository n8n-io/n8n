import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class LowerCaseUserEmail1648740597343 implements MigrationInterface {
	name = 'LowerCaseUserEmail1648740597343';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`
			UPDATE "${tablePrefix}user"
			SET email = LOWER(email);
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
