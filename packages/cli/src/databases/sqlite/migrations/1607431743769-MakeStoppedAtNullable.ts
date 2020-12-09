import {MigrationInterface, QueryRunner} from "typeorm";

import * as config from '../../../../config';

export class MakeStoppedAtNullable1607431743769 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      const tablePrefix = config.get('database.tablePrefix');
      console.log(`UPDATE SQLITE_MASTER SET SQL = 'CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)' WHERE NAME = "${tablePrefix}execution_entity";`);
      await queryRunner.query(`PRAGMA writable_schema = 1; `, undefined);
      await queryRunner.query(`UPDATE SQLITE_MASTER SET SQL = 'CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)' WHERE NAME = "${tablePrefix}execution_entity";`, undefined);
      await queryRunner.query(`PRAGMA writable_schema = 0;`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      // This cannot be undone as the table might already have nullable values
    }

}
