import type { MigrationContext, ReversibleMigration } from '@db/types';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';

export class RemoveWorkflowDataLoadedFlag1671726148419 implements ReversibleMigration {
	async up({ escape, dbType, executeQuery }: MigrationContext) {
		const workflowTableName = escape.tableName('workflow_entity');
		const statisticsTableName = escape.tableName('workflow_statistics');
		const columnName = escape.columnName('dataLoaded');

		// If any existing workflow has dataLoaded set to true, insert the relevant information to the statistics table
		const workflowIds: Array<{ id: number; dataLoaded: boolean }> = await executeQuery(
			`SELECT id, ${columnName} FROM ${workflowTableName}`,
		);

		const now =
			dbType === 'sqlite' ? "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')" : 'CURRENT_TIMESTAMP(3)';

		await Promise.all(
			workflowIds.map(
				async ({ id, dataLoaded }) =>
					dataLoaded &&
					executeQuery(
						`INSERT INTO ${statisticsTableName} (${escape.columnName(
							'workflowId',
						)}, name, count, ${escape.columnName('latestEvent')}) VALUES (:id, :name, 1, ${now})`,
						{ id, name: StatisticsNames.dataLoaded },
					),
			),
		);

		await executeQuery(`ALTER TABLE ${workflowTableName} DROP COLUMN ${columnName}`);
	}

	async down({ escape, executeQuery }: MigrationContext) {
		const workflowTableName = escape.tableName('workflow_entity');
		const statisticsTableName = escape.tableName('workflow_statistics');
		const columnName = escape.columnName('dataLoaded');

		await executeQuery(
			`ALTER TABLE ${workflowTableName} ADD COLUMN ${columnName} BOOLEAN DEFAULT false`,
		);

		// Search through statistics for any workflows that have the dataLoaded stat
		const workflowsIds: Array<{ workflowId: string }> = await executeQuery(
			`SELECT ${escape.columnName('workflowId')} FROM ${statisticsTableName} WHERE name = :name`,
			{ name: StatisticsNames.dataLoaded },
		);

		await Promise.all(
			workflowsIds.map(async ({ workflowId }) =>
				executeQuery(`UPDATE ${workflowTableName} SET ${columnName} = true WHERE id = :id`, {
					id: workflowId,
				}),
			),
		);

		await executeQuery(`DELETE FROM ${statisticsTableName} WHERE name = :name`, {
			name: StatisticsNames.dataLoaded,
		});
	}
}
