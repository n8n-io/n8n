import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { DataSource, QueryFailedError, Repository } from '@n8n/typeorm';
import assert from 'node:assert';

import {
	ProjectRelation,
	Role,
	SharedWorkflow,
	WorkflowEntity,
	WorkflowStatistics,
} from '../entities';
import type { User } from '../entities';
import { StatisticsNames } from '../entities/types-db';

type StatisticsInsertResult = 'insert' | 'failed' | 'alreadyExists';
type StatisticsUpsertResult = StatisticsInsertResult | 'update';

@Service()
export class WorkflowStatisticsRepository extends Repository<WorkflowStatistics> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(WorkflowStatistics, dataSource.manager);
	}

	async insertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
		workflowName?: string,
	): Promise<StatisticsInsertResult> {
		// Try to insert the data loaded statistic
		try {
			const exists = await this.findOne({
				where: {
					workflowId,
					name: eventName,
				},
			});
			if (exists) return 'alreadyExists';
			await this.insert({
				workflowId,
				name: eventName,
				count: 1,
				rootCount: 1,
				latestEvent: new Date(),
				workflowName: workflowName ?? null,
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
		isRootExecution: boolean,
		workflowName?: string,
	): Promise<StatisticsUpsertResult> {
		const dbType = this.globalConfig.database.type;
		const escapedTableName = this.manager.connection.driver.escape(this.metadata.tableName);

		try {
			const rootCountIncrement = isRootExecution ? 1 : 0;
			if (dbType === 'sqlite') {
				await this.query(
					`INSERT INTO ${escapedTableName} ("count", "rootCount", "name", "workflowId", "workflowName", "latestEvent")
					VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT (workflowId, name)
					DO UPDATE SET
						count = count + 1,
						rootCount = rootCount + ?,
						workflowName = excluded.workflowName,
						latestEvent = CURRENT_TIMESTAMP`,
					[rootCountIncrement, eventName, workflowId, workflowName ?? null, rootCountIncrement],
				);

				// SQLite does not offer a reliable way to know whether or not an insert or update happened.
				// We'll use a naive approach in this case. Query again after and it might cause us to miss the
				// first production execution sometimes due to concurrency, but it's the only way.
				const counter = await this.findOne({
					select: ['count'],
					where: { name: eventName, workflowId },
				});

				return (counter?.count ?? 0) > 1 ? 'update' : counter?.count === 1 ? 'insert' : 'failed';
			} else if (dbType === 'postgresdb') {
				const queryResult = (await this.query(
					`INSERT INTO ${escapedTableName} ("count", "rootCount", "name", "workflowId", "workflowName", "latestEvent")
					VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
					ON CONFLICT ("name", "workflowId")
					DO UPDATE SET
						"count" = ${escapedTableName}."count" + 1,
						"rootCount" = ${escapedTableName}."rootCount" + $5,
						"workflowName" = $4,
						"latestEvent" = CURRENT_TIMESTAMP
					RETURNING *;`,
					[rootCountIncrement, eventName, workflowId, workflowName ?? null, rootCountIncrement],
				)) as Array<{ count: string | number }>;

				return Number(queryResult[0].count) === 1 ? 'insert' : 'update';
			}

			assert.fail('Unknown database type');
		} catch (error) {
			console.log('error', error);
			if (error instanceof QueryFailedError) return 'failed';
			throw error;
		}
	}

	async queryNumWorkflowsUserHasWithFiveOrMoreProdExecs(userId: User['id']): Promise<number> {
		const result = await this.createQueryBuilder('ws')
			.select('COUNT(DISTINCT ws.workflowId)', 'count')
			.innerJoin(WorkflowEntity, 'we', 'ws.workflowId = we.id')
			.innerJoin(SharedWorkflow, 'sw', 'we.id = sw.workflowId')
			.innerJoin(ProjectRelation, 'pr', 'sw.projectId = pr.projectId')
			.innerJoin(Role, 'r', 'pr.role = r.slug')
			.where('sw.role = :role', { role: 'workflow:owner' })
			.andWhere('pr.userId = :userId', { userId })
			.andWhere('r.slug = :slug', { slug: PROJECT_OWNER_ROLE_SLUG })
			.andWhere('we.activeVersionId IS NOT NULL')
			.andWhere('ws.name = :name', { name: StatisticsNames.productionSuccess })
			.andWhere('ws.count >= :minCount', { minCount: 5 })
			.getRawOne<{ count: string }>();

		return Number(result?.count ?? 0);
	}
}
