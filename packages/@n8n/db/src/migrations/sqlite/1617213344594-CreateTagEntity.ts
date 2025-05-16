import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTagEntity1617213344594 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// create tags table + relationship with workflow entity

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b" ON "${tablePrefix}tag_entity" ("name") `,
		);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}workflows_tags" ("workflowId" integer NOT NULL, "tagId" integer NOT NULL, CONSTRAINT "FK_54b2f0343d6a2078fa137443869" FOREIGN KEY ("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_77505b341625b0b4768082e2171" FOREIGN KEY ("tagId") REFERENCES "${tablePrefix}tag_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("workflowId", "tagId"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}54b2f0343d6a2078fa13744386" ON "${tablePrefix}workflows_tags" ("workflowId") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}77505b341625b0b4768082e217" ON "${tablePrefix}workflows_tags" ("tagId") `,
		);

		// set default dates for `createdAt` and `updatedAt`

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}temporary_credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')))`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_credentials_entity"("id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt") SELECT "id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt" FROM "${tablePrefix}credentials_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}credentials_entity"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_credentials_entity" RENAME TO "${tablePrefix}credentials_entity"`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8" ON "${tablePrefix}credentials_entity" ("type") `,
		);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}temporary_tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')))`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_tag_entity"("id", "name", "createdAt", "updatedAt") SELECT "id", "name", "createdAt", "updatedAt" FROM "${tablePrefix}tag_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}tag_entity"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_tag_entity" RENAME TO "${tablePrefix}tag_entity"`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b" ON "${tablePrefix}tag_entity" ("name") `,
		);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}temporary_workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text, "connections" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "settings" text, "staticData" text)`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "${tablePrefix}workflow_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_entity"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_workflow_entity" RENAME TO "${tablePrefix}workflow_entity"`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// `createdAt` and `updatedAt`

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" RENAME TO "${tablePrefix}temporary_workflow_entity"`,
		);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "${tablePrefix}temporary_workflow_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}temporary_workflow_entity"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}tag_entity" RENAME TO "${tablePrefix}temporary_tag_entity"`,
		);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}tag_entity"("id", "name", "createdAt", "updatedAt") SELECT "id", "name", "createdAt", "updatedAt" FROM "${tablePrefix}temporary_tag_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}temporary_tag_entity"`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b" ON "${tablePrefix}tag_entity" ("name") `,
		);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}credentials_entity" RENAME TO "temporary_credentials_entity"`,
		);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}credentials_entity"("id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt") SELECT "id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt" FROM "${tablePrefix}temporary_credentials_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}temporary_credentials_entity"`);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8" ON "credentials_entity" ("type") `,
		);

		// tags

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}77505b341625b0b4768082e217"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}54b2f0343d6a2078fa13744386"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflows_tags"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}tag_entity"`);
	}
}
