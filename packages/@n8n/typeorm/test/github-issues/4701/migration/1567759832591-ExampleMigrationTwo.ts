import { MigrationInterface } from '../../../../src/migration/MigrationInterface';
import { QueryRunner } from '../../../../src/query-runner/QueryRunner';

export class ExampleMigrationOne1567759789051 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {}
	public async down(queryRunner: QueryRunner): Promise<void> {}
}
