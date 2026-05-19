import { MigrationInterface, QueryRunner } from '../../../../src';

export class CreateTable1699343893360 implements MigrationInterface {
	name = 'CreateTable1699343893360';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "foo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bar" numeric(12,7) array NOT NULL, CONSTRAINT "PK_foo" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "foo"`);
	}
}
