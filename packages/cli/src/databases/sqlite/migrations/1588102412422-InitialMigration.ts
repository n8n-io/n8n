import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import * as config from '../../../../config';

export class InitialMigration1588102412422 implements MigrationInterface {
	name = 'InitialMigration1588102412422';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "${tablePrefix}credentials_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`, void 0);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8" ON "${tablePrefix}credentials_entity" ("type") `, void 0);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime NOT NULL, "workflowData" text NOT NULL, "workflowId" varchar)`, void 0);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}c4d999a5e90784e8caccf5589d" ON "${tablePrefix}execution_entity" ("workflowId") `, void 0);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "${tablePrefix}workflow_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text)`, void 0);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_entity"`, void 0);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}c4d999a5e90784e8caccf5589d"`, void 0);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`, void 0);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8"`, void 0);
		await queryRunner.query(`DROP TABLE "${tablePrefix}credentials_entity"`, void 0);
	}

}
