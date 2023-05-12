import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class SeparateExecutionData1682411848784 implements ReversibleMigration {
	name = 'SeparateExecutionData1682411848784';

	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		logMigrationStart(this.name);

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_data" (
				"executionId" int,
				"workflowData" text NOT NULL,
				"data" text NOT NULL,
				FOREIGN KEY("executionId") REFERENCES "${tablePrefix}execution_entity" ("id") ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}execution_data" (
				"executionId",
				"workflowData",
				"data")
				SELECT "id", "workflowData", "data" FROM "${tablePrefix}execution_entity"
			`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN "workflowData"`,
		);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN "data"`);

		await queryRunner.query('PRAGMA foreign_keys=ON');

		logMigrationEnd(this.name);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
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
