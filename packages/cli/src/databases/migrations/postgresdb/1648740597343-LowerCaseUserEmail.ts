import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class LowerCaseUserEmail1648740597343 implements MigrationInterface {
	name = 'LowerCaseUserEmail1648740597343';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`
			UPDATE ${tablePrefix}user
			SET email = LOWER(email);
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
