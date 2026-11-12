import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowPublicationRetryState } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

const FIRST_RETRY_DELAY_SECONDS = 60;

const MAX_RETRY_DELAY_SECONDS = 4 * 60 * 60;

type DatabaseType = GlobalConfig['database']['type'];

/** SQL for the current database time, in the format `updatedAt` is stored in. */
export function databaseNow(type: DatabaseType): string {
	return type === 'postgresdb' ? 'CURRENT_TIMESTAMP(3)' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
}

/** SQL for the time the retry note under `alias` becomes due. */
export function retryDueAt(type: DatabaseType, alias: string): string {
	return type === 'postgresdb'
		? `${alias}."updatedAt" + make_interval(secs => ${alias}."retryDelaySeconds")`
		: `STRFTIME('%Y-%m-%d %H:%M:%f', ${alias}."updatedAt", '+' || ${alias}."retryDelaySeconds" || ' seconds')`;
}

@Service()
export class WorkflowPublicationRetryStateRepository extends BaseRepository<WorkflowPublicationRetryState> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
		transactionRunner: TransactionRunner,
	) {
		super(WorkflowPublicationRetryState, dataSource.manager, transactionRunner);
	}

	async suppressRetry(
		workflowId: string,
		targetVersionId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).upsert(
			WorkflowPublicationRetryState,
			{ workflowId, targetVersionId, retryDelaySeconds: null },
			['workflowId'],
		);
	}

	/**
	 * Doubles the delay of a due retry of the same target, up to the cap, and
	 * starts any other note at the first delay. A note that is not due yet stays
	 * as it is, because that failure did not come from its schedule.
	 */
	async scheduleRetry(
		workflowId: string,
		targetVersionId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		const { type } = this.globalConfig.database;
		const tableName = this.getTableName('workflow_publication_retry_state');
		const params = type === 'postgresdb' ? '$1, $2' : '?, ?';

		await this.managerFor(ctx).query(
			`INSERT INTO ${tableName} AS retry ("workflowId", "targetVersionId", "retryDelaySeconds")
			 VALUES (${params}, ${FIRST_RETRY_DELAY_SECONDS})
			 ON CONFLICT ("workflowId") DO UPDATE SET
				 "retryDelaySeconds" = CASE
					 WHEN retry."targetVersionId" <> excluded."targetVersionId" OR retry."retryDelaySeconds" IS NULL
						 THEN ${FIRST_RETRY_DELAY_SECONDS}
					 WHEN retry."retryDelaySeconds" * 2 > ${MAX_RETRY_DELAY_SECONDS}
						 THEN ${MAX_RETRY_DELAY_SECONDS}
					 ELSE retry."retryDelaySeconds" * 2
				 END,
				 "targetVersionId" = excluded."targetVersionId",
				 "updatedAt" = ${databaseNow(type)}
			 WHERE retry."targetVersionId" <> excluded."targetVersionId"
				 OR retry."retryDelaySeconds" IS NULL
				 OR ${retryDueAt(type, 'retry')} <= ${databaseNow(type)}`,
			[workflowId, targetVersionId],
		);
	}

	async clearRetrySuppression(workflowId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(WorkflowPublicationRetryState, { workflowId });
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
