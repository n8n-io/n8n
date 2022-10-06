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
				workflowId INTEGER,
				PRIMARY KEY(workflowId, name),
				FOREIGN KEY(workflowId) REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE
			)`,
		);

		// Add dataLoaded column to workflow table
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN dataLoaded BOOLEAN DEFAULT false`,
		);

		// Need to loop through all workflows, and then make the insertions
		const workflows = await queryRunner.query(`SELECT id FROM ${tablePrefix}workflow_entity`)
		workflows.forEach(async (workflow: { id: number }) => {
			// Run a query for each workflow to count executions
			await queryRunner.query(
				`INSERT INTO ${tablePrefix}workflow_statistics (workflowId, name, count, latestEvent) VALUES
				(
					${workflow.id},
					'production_success',
					(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 1 AND mode != 'manual'),
					(SELECT startedAt FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 1 AND mode != 'manual' ORDER BY startedAt DESC)
				),
				(
					${workflow.id},
					'production_error',
					(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 0 AND mode != 'manual'),
					(SELECT startedAt FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 0 AND mode != 'manual' ORDER BY startedAt DESC)
				),
				(
					${workflow.id},
					'manual_success',
					(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 1 AND mode == 'manual'),
					(SELECT startedAt FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 1 AND mode == 'manual' ORDER BY startedAt DESC)
				),
				(
					${workflow.id},
					'manual_error',
					(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 0 AND mode == 'manual'),
					(SELECT startedAt FROM ${tablePrefix}execution_entity WHERE workflowId = ${workflow.id} AND finished = 0 AND mode == 'manual' ORDER BY startedAt DESC)
				);`,
			)
		});

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_statistics`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN dataLoaded`);
	}
}
