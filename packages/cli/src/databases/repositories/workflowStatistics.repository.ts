import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import config from '@/config';
import type { StatisticsNames } from '../entities/WorkflowStatistics';
import { WorkflowStatistics } from '../entities/WorkflowStatistics';

type StatisticsUpsertResult = 'insert' | 'update';

const dbType = config.getEnv('database.type');

@Service()
export class WorkflowStatisticsRepository extends Repository<WorkflowStatistics> {
	constructor(dataSource: DataSource) {
		super(WorkflowStatistics, dataSource.manager);
	}

	async upsertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
		updateOnConflict: boolean,
	): Promise<StatisticsUpsertResult> {
		const { tableName } = this.metadata;
		if (dbType === 'sqlite') {
			await this.query(
				`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
					VALUES (1, "${eventName}", "${workflowId}", CURRENT_TIMESTAMP)
					ON CONFLICT (workflowId, name)
					${
						updateOnConflict
							? 'DO UPDATE SET count = count + 1, latestEvent = CURRENT_TIMESTAMP'
							: 'IGNORE'
					}`,
			);
			// SQLite does not offer a reliable way to know whether or not an insert or update happened.
			// We'll use a naive approach in this case. Query again after and it might cause us to miss the
			// first production execution sometimes due to concurrency, but it's the only way.
			const counter = await this.findOneOrFail({
				select: ['count'],
				where: {
					name: eventName,
					workflowId,
				},
			});

			return counter.count === 1 ? 'insert' : 'update';
		} else if (dbType === 'postgresdb') {
			const queryResult = (await this.query(
				`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
						VALUES (1, '${eventName}', '${workflowId}', CURRENT_TIMESTAMP)
						ON CONFLICT ("name", "workflowId")
						${
							updateOnConflict
								? `DO UPDATE SET "count" = "${tableName}"."count" + 1, "latestEvent" = CURRENT_TIMESTAMP`
								: 'DO NOTHING'
						}
						RETURNING *`,
			)) as Array<{
				count: number;
			}>;
			return queryResult[0].count === 1 ? 'insert' : 'update';
		} else {
			const queryResult = (await this.query(
				`INSERT ${
					updateOnConflict ? '' : 'IGNORE'
				} INTO \`${tableName}\` (count, name, workflowId, latestEvent)
						VALUES (1, "${eventName}", "${workflowId}", NOW())
						${updateOnConflict ? 'ON DUPLICATE KEY UPDATE count = count + 1, latestEvent = NOW()' : ''}`,
			)) as {
				affectedRows: number;
			};
			return queryResult.affectedRows === 1 ? 'insert' : 'update';
		}
	}
}
