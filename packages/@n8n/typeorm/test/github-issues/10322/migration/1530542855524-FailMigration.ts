import { MigrationInterface, QueryRunner } from '../../../../src';

export class FailMigration1530542855524 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		throw new Error('migration error');
	}
	public async down(queryRunner: QueryRunner): Promise<void> {
		throw new Error('migration error');
	}
}
