import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class WorkflowStatistics1664196174001 implements MigrationInterface {
	name = 'WorkflowStatistics1664196174001';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		// Create statistics table
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}workflow_statistics (
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATE,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" INTEGER,
				PRIMARY KEY("workflowId", "name"),
				FOREIGN KEY("workflowId") REFERENCES ${tablePrefix}workflow_entity("id") ON DELETE CASCADE
			)`,
		);

		// Add dataLoaded column to workflow table
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN "dataLoaded" BOOLEAN DEFAULT false;`,
		);

		// Fetch data from executions table to populate statistics table
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}workflow_statistics ("count", "latestEvent", "name", "workflowId")
			SELECT
			  COUNT("id") as "count",
				COALESCE(MAX("stoppedAt"), MAX("startedAt")) as "latestEvent",
				CASE WHEN "finished" = true THEN 'production_success' ELSE 'production_error' END as "name",
				CAST ("workflowId" AS INTEGER) AS "workflowId"
			FROM ${tablePrefix}execution_entity
			WHERE "workflowId" IS NOT NULL
				AND mode != 'manual'
			GROUP BY "workflowId", "finished"
			ORDER BY "workflowId";`,
		);
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}workflow_statistics ("count", "latestEvent", "name", "workflowId")
			SELECT
			  COUNT("id") as "count",
				COALESCE(MAX("stoppedAt"), MAX("startedAt")) as "latestEvent",
				CASE WHEN "finished" = true THEN 'production_success' ELSE 'production_error' END as "name",
				CAST ("workflowId" AS INTEGER) AS "workflowId"
			FROM ${tablePrefix}execution_entity
			WHERE "workflowId" IS NOT NULL
				AND mode == 'manual'
			GROUP BY "workflowId", "finished"
			ORDER BY "workflowId";`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_statistics`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN dataLoaded`);
	}
}
