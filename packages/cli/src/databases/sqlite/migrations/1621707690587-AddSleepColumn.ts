import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddSleepColumn1621707690587 implements MigrationInterface {
	name = 'AddSleepColumn1621707690587';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		// IMPORTANT: Danger currently it will delete all past executions
		// TODO: In the future we obviously have to copy the data (so first create temp, copy data, rename)
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar, "sleepTill" DATETIME)`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}c4d999a5e90784e8caccf5589d" ON "${tablePrefix}execution_entity" ("workflowId") `, undefined);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON "${tablePrefix}execution_entity" ("sleepTill") `);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// const tablePrefix = config.get('database.tablePrefix');

	}

}
