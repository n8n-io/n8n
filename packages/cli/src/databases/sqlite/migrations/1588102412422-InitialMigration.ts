import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1588102412422 implements MigrationInterface {
	name = 'InitialMigration1588102412422';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_07fde106c0b471d8cc80a64fc8" ON "credentials_entity" ("type") `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime NOT NULL, "workflowData" text NOT NULL, "workflowId" varchar)`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS  "IDX_c4d999a5e90784e8caccf5589d" ON "execution_entity" ("workflowId") `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`, undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "workflow_entity"`, undefined);
		await queryRunner.query(`DROP INDEX "IDX_c4d999a5e90784e8caccf5589d"`, undefined);
		await queryRunner.query(`DROP TABLE "execution_entity"`, undefined);
		await queryRunner.query(`DROP INDEX "IDX_07fde106c0b471d8cc80a64fc8"`, undefined);
		await queryRunner.query(`DROP TABLE "credentials_entity"`, undefined);
	}

}
