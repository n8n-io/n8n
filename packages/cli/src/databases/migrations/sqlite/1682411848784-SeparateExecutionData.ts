import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class SeparateExecutionData1682411848784 implements MigrationInterface {
	name = 'SeparateExecutionData1682411848784';

	transaction = true;

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		console.log('about to create execution data table');
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_data" (
				"executionId" int,
				"workflowData" text NOT NULL,
				"data" text NOT NULL,
				FOREIGN KEY("executionId") REFERENCES "${tablePrefix}execution_entity" ("id") ON DELETE CASCADE
			)`,
		);
		console.log(
			'finished creating execution data table, will start dumping execution data into it',
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}execution_data" (
				"executionId",
				"workflowData",
				"data")
				SELECT "id", "workflowData", "data" FROM "${tablePrefix}execution_entity"
			`,
		);
		console.log('done dumping data. will create new temporary exec table.');

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
				"status" varchar NOT NULL,
				FOREIGN KEY("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE
			)`,
		);
		console.log('done creating tempo table. will dump data to it.');

		const columns =
			'"id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status"';
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}temporary_execution_entity"(${columns}) SELECT ${columns} FROM "${tablePrefix}execution_entity"`,
		);
		console.log('done dumping data to temp table');
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity"`);
		console.log('dropped old execution table');
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}temporary_execution_entity" RENAME TO "${tablePrefix}execution_entity"`,
		);
		console.log('renamed temp table to execution table');

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9' ON '${tablePrefix}execution_entity' ('waitTill', 'id') `,
		);
		console.log('created first index');
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}81fc04c8a17de15835713505e4' ON '${tablePrefix}execution_entity' ('workflowId', 'id') `,
		);
		console.log('created second index');
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584' ON '${tablePrefix}execution_entity' ('status', 'workflowId') `,
		);
		console.log('created third index');

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
