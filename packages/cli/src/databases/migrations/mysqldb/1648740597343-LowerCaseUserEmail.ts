import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class LowerCaseUserEmail1648740597343 implements MigrationInterface {
	name = 'LowerCaseUserEmail1648740597343';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`
			UPDATE ${tablePrefix}user
			SET email = LOWER(email);
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
