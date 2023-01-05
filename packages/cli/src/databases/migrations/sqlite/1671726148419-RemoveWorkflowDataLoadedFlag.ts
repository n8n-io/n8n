import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';
import { v4 as uuidv4 } from 'uuid';
import { StatisticsNames } from '@/databases/entities/WorkflowStatistics';

export class RemoveWorkflowDataLoadedFlag1671726148419 implements MigrationInterface {
	name = 'RemoveWorkflowDataLoadedFlag1671726148419';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = config.getEnv('database.tablePrefix');

		// If any existing workflow has dataLoaded set to true, insert the relevant information to the statistics table
		const workflowIds: Array<{ id: number; dataLoaded: boolean }> = await queryRunner.query(`
			SELECT id, dataLoaded
			FROM "${tablePrefix}workflow_entity"
		`);

		workflowIds.map(({ id, dataLoaded }) => {
			if (dataLoaded) {
				const [insertQuery, insertParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
					INSERT INTO "${tablePrefix}workflow_statistics" (workflowId, name, count, latestEvent) VALUES
					(:id, :name, 1, STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
					`,
					{ id, name: StatisticsNames.dataLoaded },
					{},
				);

				return queryRunner.query(insertQuery, insertParams);
			}
			return undefined;
		});

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "dataLoaded"`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "dataLoaded" BOOLEAN DEFAULT false`,
		);

		// Search through statistics for any workflows that have the dataLoaded stat
		const workflowsIds: Array<{ workflowId: string }> = await queryRunner.query(`
			SELECT workflowId
			FROM "${tablePrefix}workflow_statistics"
			WHERE name = '${StatisticsNames.dataLoaded}'
		`);
		workflowsIds.map(({ workflowId }) => {
			return queryRunner.query(`
				UPDATE "${tablePrefix}workflow_entity"
				SET dataLoaded = true
				WHERE id = '${workflowId}'`);
		});

		await queryRunner.query(
			`DELETE FROM "${tablePrefix}workflow_statistics" WHERE name = '${StatisticsNames.dataLoaded}'`,
		);
	}
}
