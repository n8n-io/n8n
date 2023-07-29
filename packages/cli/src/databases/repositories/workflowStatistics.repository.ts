import { Service } from 'typedi';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import config from '@/config';
import type { StatisticsNames } from '../entities/WorkflowStatistics';
import { WorkflowStatistics } from '../entities/WorkflowStatistics';

type StatisticsInsertResult = 'insert' | 'failed';
type StatisticsUpsertResult = StatisticsInsertResult | 'update';

@Service()
export class WorkflowStatisticsRepository extends Repository<WorkflowStatistics> {
	private readonly dbType = config.getEnv('database.type');

	constructor(dataSource: DataSource) {
		super(WorkflowStatistics, dataSource.manager);
	}

	async insertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
	): Promise<StatisticsInsertResult> {
		// Try to insert the data loaded statistic
		try {
			await this.insert({
				workflowId,
				name: eventName,
				count: 1,
				latestEvent: new Date(),
			});
			return 'insert';
		} catch (error) {
			// if it's a duplicate key error then that's fine, otherwise throw the error
			if (!(error instanceof QueryFailedError)) {
				throw error;
			}
			// If it is a query failed error, we return
			return 'failed';
		}
	}

	async upsertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
	): Promise<StatisticsUpsertResult> {
		const { tableName } = this.metadata;
		try {
			if (this.dbType === 'sqlite') {
				await this.query(
					`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
					VALUES (1, "${eventName}", "${workflowId}", CURRENT_TIMESTAMP)
					ON CONFLICT (workflowId, name)
					DO UPDATE SET count = count + 1, latestEvent = CURRENT_TIMESTAMP`,
				);
				// SQLite does not offer a reliable way to know whether or not an insert or update happened.
				// We'll use a naive approach in this case. Query again after and it might cause us to miss the
				// first production execution sometimes due to concurrency, but it's the only way.
				const counter = await this.findOne({
					select: ['count'],
					where: {
						name: eventName,
						workflowId,
					},
				});

				return counter?.count === 1 ? 'insert' : 'failed';
			} else if (this.dbType === 'postgresdb') {
				const queryResult = (await this.query(
					`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
					VALUES (1, '${eventName}', '${workflowId}', CURRENT_TIMESTAMP)
					ON CONFLICT ("name", "workflowId")
					DO UPDATE SET "count" = "${tableName}"."count" + 1, "latestEvent" = CURRENT_TIMESTAMP
					RETURNING *;`,
				)) as Array<{
					count: number;
				}>;
				return queryResult[0].count === 1 ? 'insert' : 'update';
			} else {
				const queryResult = (await this.query(
					`INSERT INTO \`${tableName}\` (count, name, workflowId, latestEvent)
					VALUES (1, "${eventName}", "${workflowId}", NOW())
					ON DUPLICATE KEY
					UPDATE count = count + 1, latestEvent = NOW();`,
				)) as {
					affectedRows: number;
				};
				// MySQL returns 2 affected rows on update
				return queryResult.affectedRows === 1 ? 'insert' : 'update';
			}
		} catch (error) {
			if (error instanceof QueryFailedError) return 'failed';
			throw error;
		}
	}
}
