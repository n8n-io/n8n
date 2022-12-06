import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '@/config';

export class WorkflowStatistics1664196174001 implements MigrationInterface {
	name = 'WorkflowStatistics1664196174001';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		// Create statistics table
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}workflow_statistics (
				"count" INTEGER DEFAULT 0,
				"latestEvent" TIMESTAMP,
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
