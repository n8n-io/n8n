import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddWaitColumn1621707690587 implements MigrationInterface {
	name = 'AddWaitColumn1621707690587';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		console.log('\n\nINFO: Started with migration for wait functionality.\n      Depending on the number of saved executions, that may take a little bit.\n\n');

		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}temporary_execution_entity"`);
		await queryRunner.query(`CREATE TABLE "${tablePrefix}temporary_execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar, "waitTill" DATETIME)`, undefined);
		await queryRunner.query(`INSERT INTO "${tablePrefix}temporary_execution_entity"("id", "data", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "workflowData", "workflowId") SELECT "id", "data", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "workflowData", "workflowId" FROM "${tablePrefix}execution_entity"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}temporary_execution_entity" RENAME TO "${tablePrefix}execution_entity"`);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt")`);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON "${tablePrefix}execution_entity" ("waitTill")`);
		await queryRunner.query(`VACUUM;`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "${tablePrefix}temporary_execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)`, undefined);		
		await queryRunner.query(`INSERT INTO "${tablePrefix}temporary_execution_entity"("id", "data", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "workflowData", "workflowId") SELECT "id", "data", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "workflowData", "workflowId" FROM "${tablePrefix}execution_entity"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}temporary_execution_entity" RENAME TO "${tablePrefix}execution_entity"`);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt")`);
		await queryRunner.query(`VACUUM;`);

	}

}
