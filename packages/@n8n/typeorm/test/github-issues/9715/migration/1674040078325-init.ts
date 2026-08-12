import { MigrationInterface, QueryRunner } from '../../../../src';

export class init1674040078325 implements MigrationInterface {
	name = 'init1674040078325';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "example_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enumcolumn" varchar CHECK( "enumcolumn" IN ('enumvalue1','enumvalue2','enumvalue3') ) NOT NULL)`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "example_entity"`);
	}
}
