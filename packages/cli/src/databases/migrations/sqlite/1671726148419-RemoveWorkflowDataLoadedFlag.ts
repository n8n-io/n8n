import type { MigrationContext, ReversibleMigration } from '@db/types';
import { StatisticsNames } from '@/databases/entities/WorkflowStatistics';

export class RemoveWorkflowDataLoadedFlag1671726148419 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// If any existing workflow has dataLoaded set to true, insert the relevant information to the statistics table
		const workflowIds = (await queryRunner.query(`
			SELECT id, dataLoaded
			FROM "${tablePrefix}workflow_entity"
		`)) as Array<{ id: number; dataLoaded: boolean }>;

		workflowIds.map(async ({ id, dataLoaded }) => {
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
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "dataLoaded" BOOLEAN DEFAULT false`,
		);

		// Search through statistics for any workflows that have the dataLoaded stat
		const workflowsIds = (await queryRunner.query(`
			SELECT workflowId
			FROM "${tablePrefix}workflow_statistics"
			WHERE name = '${StatisticsNames.dataLoaded}'
		`)) as Array<{ workflowId: string }>;
		workflowsIds.map(async ({ workflowId }) => {
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
