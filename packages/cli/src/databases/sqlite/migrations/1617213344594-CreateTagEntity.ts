import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class CreateTagEntity1617213344594 implements MigrationInterface {
	name = 'CreateTagEntity1617213344594';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE "${tablePrefix}tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b" ON "${tablePrefix}tag_entity" ("name") `);
		await queryRunner.query(`CREATE TABLE "${tablePrefix}workflows_tags" ("workflowId" integer NOT NULL, "tagId" integer NOT NULL, CONSTRAINT "FK_54b2f0343d6a2078fa137443869" FOREIGN KEY ("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_77505b341625b0b4768082e2171" FOREIGN KEY ("tagId") REFERENCES "${tablePrefix}tag_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("workflowId", "tagId"))`);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}54b2f0343d6a2078fa13744386" ON "${tablePrefix}workflows_tags" ("workflowId") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}77505b341625b0b4768082e217" ON "${tablePrefix}workflows_tags" ("tagId") `);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}77505b341625b0b4768082e217"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}54b2f0343d6a2078fa13744386"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflows_tags"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}tag_entity"`);
	}

}
