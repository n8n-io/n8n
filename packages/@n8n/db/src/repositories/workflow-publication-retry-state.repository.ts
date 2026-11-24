import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowPublicationRetryState } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

/** Not zero, because a retry at once would hit the same outage that just failed the activation. */
const FIRST_RETRY_DELAY_SECONDS = 1 * Time.minutes.toSeconds;

/** The doubling stops here, so a trigger comes back within four hours of its server and a dead one costs at most six attempts a day. */
const MAX_RETRY_DELAY_SECONDS = 4 * Time.hours.toSeconds;

/** Three days, because that covers an outage from Friday evening to Monday morning. */
const RETRY_PERIOD_SECONDS = 3 * Time.days.toSeconds;

type DatabaseType = GlobalConfig['database']['type'];

/** SQL for the current database time, in the format `updatedAt` is stored in. */
export function databaseNow(type: DatabaseType): string {
	return type === 'postgresdb' ? 'CURRENT_TIMESTAMP(3)' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
}

function plusSeconds(type: DatabaseType, timestamp: string, seconds: string): string {
	return type === 'postgresdb'
		? `${timestamp} + make_interval(secs => ${seconds})`
		: `STRFTIME('%Y-%m-%d %H:%M:%f', ${timestamp}, '+' || ${seconds} || ' seconds')`;
}

/** SQL for the time the retry note under `alias` becomes due. */
export function retryDueAt(type: DatabaseType, alias: string): string {
	return plusSeconds(type, `${alias}."updatedAt"`, `${alias}."retryDelaySeconds"`);
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
	 * stops the retries once the target has failed for the retry period. Starts
	 * a note for another target at the first delay. A note that is not due yet,
	 * or that has no delay, stays as it is.
	 */
	async scheduleRetry(
		workflowId: string,
		targetVersionId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		const { type } = this.globalConfig.database;
		const tableName = this.getTableName('workflow_publication_retry_state');
		const params = type === 'postgresdb' ? '$1, $2' : '?, ?';
		const startsNewNote = 'retry."targetVersionId" <> excluded."targetVersionId"';
		const retryPeriodEndsAt = plusSeconds(type, 'retry."createdAt"', `${RETRY_PERIOD_SECONDS}`);

		await this.managerFor(ctx).query(
			`INSERT INTO ${tableName} AS retry ("workflowId", "targetVersionId", "retryDelaySeconds")
			 VALUES (${params}, ${FIRST_RETRY_DELAY_SECONDS})
			 ON CONFLICT ("workflowId") DO UPDATE SET
				 "retryDelaySeconds" = CASE
					 WHEN ${startsNewNote}
						 THEN ${FIRST_RETRY_DELAY_SECONDS}
					 WHEN ${retryPeriodEndsAt} <= ${databaseNow(type)}
						 THEN NULL
					 WHEN retry."retryDelaySeconds" * 2 > ${MAX_RETRY_DELAY_SECONDS}
						 THEN ${MAX_RETRY_DELAY_SECONDS}
					 ELSE retry."retryDelaySeconds" * 2
				 END,
				 "createdAt" = CASE
					 WHEN ${startsNewNote} THEN ${databaseNow(type)}
					 ELSE retry."createdAt"
				 END,
				 "targetVersionId" = excluded."targetVersionId",
				 "updatedAt" = ${databaseNow(type)}
			 WHERE ${startsNewNote}
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
