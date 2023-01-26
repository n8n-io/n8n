import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class DeleteExecutionsWithWorkflows1673268682475 implements MigrationInterface {
	name = 'DeleteExecutionsWithWorkflows1673268682475';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		const workflowIds: Array<{ id: number }> = await queryRunner.query(`
			SELECT id FROM "${tablePrefix}workflow_entity"
		`);

		await queryRunner.query(
			`DELETE FROM "${tablePrefix}execution_entity"
			 WHERE "workflowId" IS NOT NULL
			 ${
					workflowIds.length
						? `AND "workflowId" NOT IN (${workflowIds.map(({ id }) => id).join()})`
						: ''
				}`,
		);

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}temporary_execution_entity"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}temporary_execution_entity" (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"workflowId" int,
				"finished" boolean NOT NULL,
				"mode" varchar NOT NULL,
				"retryOf" varchar,
				"retrySuccessId" varchar,
				"startedAt" datetime NOT NULL,
				"stoppedAt" datetime,
				"waitTill" datetime,
				"workflowData" text NOT NULL,
				"data" text NOT NULL,
				FOREIGN KEY("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE
			)`,
		);

		const columns =
			'"id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "workflowData", "data"';
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_execution_entity"(${columns}) SELECT ${columns} FROM "${tablePrefix}execution_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_execution_entity" RENAME TO "${tablePrefix}execution_entity"`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON "${tablePrefix}execution_entity" ("waitTill")`,
		);

		await queryRunner.query('PRAGMA foreign_keys=ON');

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}temporary_execution_entity"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}temporary_execution_entity" (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"workflowId" varchar,
				"finished" boolean NOT NULL,
				"mode" varchar NOT NULL,
				"retryOf" varchar,
				"retrySuccessId" varchar,
				"startedAt" datetime NOT NULL,
				"stoppedAt" datetime,
				"waitTill" datetime,
				"workflowData" text NOT NULL,
				"data" text NOT NULL
			)`,
		);

		const columns =
			'"id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "workflowData", "data"';
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_execution_entity"(${columns}) SELECT ${columns} FROM "${tablePrefix}execution_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_execution_entity" RENAME TO "${tablePrefix}execution_entity"`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON "${tablePrefix}execution_entity" ("waitTill")`,
		);
	}
}
