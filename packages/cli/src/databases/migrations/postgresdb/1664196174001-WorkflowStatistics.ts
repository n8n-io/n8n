import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class WorkflowStatistics1664196174001 implements MigrationInterface {
	name = 'WorkflowStatistics1664196174001';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}workflow_statistics (
				count INTEGER DEFAULT 0,
				latestEvent DATE,
				name VARCHAR(128) NOT NULL,
				workflow INTEGER,
				PRIMARY KEY(workflow, name),
				FOREIGN KEY(workflow) REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE
			)`,
		);

		// Add dataLoaded column to workflow table
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN dataLoaded BOOLEAN DEFAULT false`,
		);

		// TODO - Prepop these keys / values

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_statistics`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN dataLoaded`);
	}
}
