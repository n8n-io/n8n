import {MigrationInterface, QueryRunner} from "typeorm";

export class SetDefaultDates1620313518536 implements MigrationInterface {
		name = 'SetDefaultDates1620313518536';

		async up(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query(`CREATE TABLE "temporary_workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`);
				await queryRunner.query(`INSERT INTO "temporary_workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "workflow_entity"`);
				await queryRunner.query(`DROP TABLE "workflow_entity"`);
				await queryRunner.query(`ALTER TABLE "temporary_workflow_entity" RENAME TO "workflow_entity"`);
				await queryRunner.query(`DROP INDEX "IDX_07fde106c0b471d8cc80a64fc8"`);
				await queryRunner.query(`CREATE TABLE "temporary_credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')))`);
				await queryRunner.query(`INSERT INTO "temporary_credentials_entity"("id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt") SELECT "id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt" FROM "credentials_entity"`);
				await queryRunner.query(`DROP TABLE "credentials_entity"`);
				await queryRunner.query(`ALTER TABLE "temporary_credentials_entity" RENAME TO "credentials_entity"`);
				await queryRunner.query(`CREATE INDEX "IDX_07fde106c0b471d8cc80a64fc8" ON "credentials_entity" ("type") `);
				await queryRunner.query(`DROP INDEX "IDX_8f949d7a3a984759044054e89b"`);
				await queryRunner.query(`CREATE TABLE "temporary_tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')))`);
				await queryRunner.query(`INSERT INTO "temporary_tag_entity"("id", "name", "createdAt", "updatedAt") SELECT "id", "name", "createdAt", "updatedAt" FROM "tag_entity"`);
				await queryRunner.query(`DROP TABLE "tag_entity"`);
				await queryRunner.query(`ALTER TABLE "temporary_tag_entity" RENAME TO "tag_entity"`);
				await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8f949d7a3a984759044054e89b" ON "tag_entity" ("name") `);
				await queryRunner.query(`CREATE TABLE "temporary_workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text, "connections" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "settings" text, "staticData" text)`);
				await queryRunner.query(`INSERT INTO "temporary_workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "workflow_entity"`);
				await queryRunner.query(`DROP TABLE "workflow_entity"`);
				await queryRunner.query(`ALTER TABLE "temporary_workflow_entity" RENAME TO "workflow_entity"`);
		}

		async down(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query(`ALTER TABLE "workflow_entity" RENAME TO "temporary_workflow_entity"`);
				await queryRunner.query(`CREATE TABLE "workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`);
				await queryRunner.query(`INSERT INTO "workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "temporary_workflow_entity"`);
				await queryRunner.query(`DROP TABLE "temporary_workflow_entity"`);
				await queryRunner.query(`DROP INDEX "IDX_8f949d7a3a984759044054e89b"`);
				await queryRunner.query(`ALTER TABLE "tag_entity" RENAME TO "temporary_tag_entity"`);
				await queryRunner.query(`CREATE TABLE "tag_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`);
				await queryRunner.query(`INSERT INTO "tag_entity"("id", "name", "createdAt", "updatedAt") SELECT "id", "name", "createdAt", "updatedAt" FROM "temporary_tag_entity"`);
				await queryRunner.query(`DROP TABLE "temporary_tag_entity"`);
				await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8f949d7a3a984759044054e89b" ON "tag_entity" ("name") `);
				await queryRunner.query(`DROP INDEX "IDX_07fde106c0b471d8cc80a64fc8"`);
				await queryRunner.query(`ALTER TABLE "credentials_entity" RENAME TO "temporary_credentials_entity"`);
				await queryRunner.query(`CREATE TABLE "credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`);
				await queryRunner.query(`INSERT INTO "credentials_entity"("id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt") SELECT "id", "name", "data", "type", "nodesAccess", "createdAt", "updatedAt" FROM "temporary_credentials_entity"`);
				await queryRunner.query(`DROP TABLE "temporary_credentials_entity"`);
				await queryRunner.query(`CREATE INDEX "IDX_07fde106c0b471d8cc80a64fc8" ON "credentials_entity" ("type") `);
				await queryRunner.query(`ALTER TABLE "workflow_entity" RENAME TO "temporary_workflow_entity"`);
				await queryRunner.query(`CREATE TABLE "workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`);
				await queryRunner.query(`INSERT INTO "workflow_entity"("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "temporary_workflow_entity"`);
				await queryRunner.query(`DROP TABLE "temporary_workflow_entity"`);
		}

}
