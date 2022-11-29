import { User } from '@/databases/entities/User';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { IDataObject, LoggerProxy } from 'n8n-workflow';
import { In } from 'typeorm';
import { DatabaseType, Db, GenericHelpers } from '..';

export class ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User
	 * Overridden in EE version to ignore roles
	 */
	 static async getWorkflowIdsForUser(user: User): Promise<number[]> {
		// Get all workflows using owner role
		return await getSharedWorkflowIds(user, ['owner']);
	}

	/**
	 * Helper function to retrieve count of Executions
	 */
	static async getExecutionsCount(
		countFilter: IDataObject,
		user: User,
	): Promise<{ count: number; estimated: boolean }> {
		const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
		const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

		// For databases other than Postgres, do a regular count
		// when filtering based on `workflowId` or `finished` fields.
		if (dbType !== 'postgresdb' || filteredFields.length > 0 || user.globalRole.name !== 'owner') {
			const sharedWorkflowIds = await this.getWorkflowIdsForUser(user);

			const countParams = { where: { workflowId: In(sharedWorkflowIds), ...countFilter } }
			const count = await Db.collections.Execution.count(countParams);
			return { count, estimated: false };
		}

		try {
			// Get an estimate of rows count.
			const estimateRowsNumberSql =
				"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
			const rows: Array<{ n_live_tup: string }> = await Db.collections.Execution.query(
				estimateRowsNumberSql,
			);

			const estimate = parseInt(rows[0].n_live_tup, 10);
			// If over 100k, return just an estimate.
			if (estimate > 100_000) {
				// if less than 100k, we get the real count as even a full
				// table scan should not take so long.
				return { count: estimate, estimated: true };
			}
		} catch (error) {
			LoggerProxy.warn(`Failed to get executions count from Postgres: ${error}`);
		}

		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		const count = await Db.collections.Execution.count({
			where: {
				workflowId: In(sharedWorkflowIds),
			},
		});

		return { count, estimated: false };
	}
}
