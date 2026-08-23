import { MigrationInterface } from '../../../../src/migration/MigrationInterface';
import { QueryRunner } from '../../../../src/query-runner/QueryRunner';

export class InitUsers1530542855524 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            CREATE SEQUENCE users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1
        `);
		await queryRunner.query(`
            DROP SEQUENCE IF EXISTS users_id_seq
        `);
	}
	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            DROP SEQUENCE IF EXISTS users_id_seq
        `);
	}
}
