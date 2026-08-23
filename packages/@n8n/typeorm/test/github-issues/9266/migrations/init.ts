import { MigrationInterface, QueryRunner } from '../../../../src';

export class CreateDatabase implements MigrationInterface {
	name = 'CreateDatabase1623518107000';
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "author" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`,
		);
		await queryRunner.query(
			`CREATE TABLE "post" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "text" varchar NOT NULL, "authorId" integer NOT NULL REFERENCES author(id) ON DELETE CASCADE ON UPDATE NO ACTION)`,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
