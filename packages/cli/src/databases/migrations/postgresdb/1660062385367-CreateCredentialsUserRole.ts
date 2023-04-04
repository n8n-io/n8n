import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class CreateCredentialsUserRole1660062385367 implements MigrationInterface {
	name = 'CreateCredentialsUserRole1660062385367';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`
			INSERT INTO ${tablePrefix}role (name, scope)
			VALUES ('user', 'credential')
			ON CONFLICT DO NOTHING;
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='credential';
		`);
	}
}
