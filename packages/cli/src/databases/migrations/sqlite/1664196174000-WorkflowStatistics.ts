import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class WorkflowStatistics1664196174000 implements MigrationInterface {
	name = 'WorkflowStatistics1664196174000';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}workflow_statistics\` (
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATETIME,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" INTEGER,
				PRIMARY KEY("workflowId", "name"),
				FOREIGN KEY("workflowId") REFERENCES \`${tablePrefix}workflow_entity\`("id") ON DELETE CASCADE
			)`,
		);

		// Add dataLoaded column to workflow table
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "dataLoaded" BOOLEAN DEFAULT false`,
		);

		// Fetch data from executions table to populate statistics table
		await queryRunner.query(
			`INSERT INTO \`${tablePrefix}workflow_statistics\` ("count", "latestEvent", "name", "workflowId")
			SELECT
			  COUNT("id") as "count",
				IFNULL(MAX("stoppedAt"), MAX("startedAt")) as "latestEvent",
				IIF("finished" == 1, 'production_success', 'production_error') as "name",
				"workflowId"
			FROM \`${tablePrefix}execution_entity\`
			WHERE "workflowId" IS NOT NULL
				AND mode != 'manual'
			GROUP BY "workflowId", "finished"
			ORDER BY "workflowId";`,
		);
		await queryRunner.query(
			`INSERT INTO \`${tablePrefix}workflow_statistics\` ("count", "latestEvent", "name", "workflowId")
			SELECT
				COUNT("id") as "count",
				IFNULL(MAX("stoppedAt"), MAX("startedAt")) as "latestEvent",
				IIF("finished" == 1, 'production_success', 'production_error') as "name",
				"workflowId"
			FROM \`${tablePrefix}execution_entity\`
			WHERE "workflowId" IS NOT NULL
				AND mode == 'manual'
			GROUP BY "workflowId", "finished"
			ORDER BY "workflowId";`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_statistics"`);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "dataLoaded"`,
		);
	}
}
