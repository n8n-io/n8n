import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	ExecutionCancelledError,
	sleep,
} from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';
import { Service } from 'typedi';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type {
	ExecutionPayload,
	IExecutingWorkflowData,
	IExecutionDb,
	IExecutionsCurrentSummary,
} from '@/interfaces';
import { Logger } from '@/logger';
import { isWorkflowIdValid } from '@/utils';

import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import config from './config';
import { inProduction } from './constants';

@Service()
export class ActiveExecutions {
	/**
	 * Active executions in the current process, not globally.
	 */
	private activeExecutions: {
		[executionId: string]: IExecutingWorkflowData;
	} = {};

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly concurrencyControl: ConcurrencyControlService,
	) {}

	has(executionId: string) {
		return this.activeExecutions[executionId] !== undefined;
	}

	/**
	 * Add a new active execution
	 */
	async add(executionData: IWorkflowExecutionDataProcess, executionId?: string): Promise<string> {
		let executionStatus: ExecutionStatus = executionId ? 'running' : 'new';
		const mode = executionData.executionMode;
		if (executionId === undefined) {
			// Is a new execution so save in DB

			const fullExecutionData: ExecutionPayload = {
				data: executionData.executionData!,
				mode,
				finished: false,
				startedAt: new Date(),
				workflowData: executionData.workflowData,
				status: executionStatus,
				workflowId: executionData.workflowData.id,
			};

			if (executionData.retryOf !== undefined) {
				fullExecutionData.retryOf = executionData.retryOf.toString();
			}

			const workflowId = executionData.workflowData.id;
			if (workflowId !== undefined && isWorkflowIdValid(workflowId)) {
				fullExecutionData.workflowId = workflowId;
			}

			executionId = await this.executionRepository.createNewExecution(fullExecutionData);
			assert(executionId);

			await this.concurrencyControl.throttle({ mode, executionId });
			executionStatus = 'running';
		} else {
			// Is an existing execution we want to finish so update in DB

			await this.concurrencyControl.throttle({ mode, executionId });

			const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
				id: executionId,
				data: executionData.executionData!,
				waitTill: null,
				status: executionStatus,
			};

			await this.executionRepository.updateExistingExecution(executionId, execution);
		}

		const postExecutePromise = createDeferredPromise<IRun | undefined>();

		this.activeExecutions[executionId] = {
			executionData,
			startedAt: new Date(),
			postExecutePromise,
			status: executionStatus,
		};

		// Automatically remove execution once the postExecutePromise settles
		void postExecutePromise.promise
			.finally(() => {
				this.concurrencyControl.release({ mode: executionData.executionMode });
				setImmediate(() => {
					delete this.activeExecutions[executionId];
				});
			})
			// Attach a no-op handler to prevent an unhandled rejection, because
			// finally will not handle it, but rather rethrow it.
			.catch(() => {});

		return executionId;
	}

	/**
	 * Attaches an execution
	 */

	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>) {
		this.getExecution(executionId).workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		this.getExecution(executionId).responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		const execution = this.activeExecutions[executionId];
		execution?.responsePromise?.resolve(response);
	}

	/** Forces an execution to stop */
	stopExecution(executionId: string): void {
		const execution = this.getExecution(executionId);
		execution.workflowExecution?.cancel();
		execution.postExecutePromise.reject(new ExecutionCancelledError(executionId));
	}

	/** Mark an execution as completed */
	finishExecution(executionId: string, fullRunData?: IRun) {
		const execution = this.getExecution(executionId);
		execution.postExecutePromise.resolve(fullRunData);
	}

	/**
	 * Returns a promise which will resolve with the data of the execution with the given id
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		return await this.getExecution(executionId).postExecutePromise.promise;
	}

	/**
	 * Returns all the currently active executions
	 */
	getActiveExecutions(): IExecutionsCurrentSummary[] {
		const returnData: IExecutionsCurrentSummary[] = [];

		let data;

		for (const id of Object.keys(this.activeExecutions)) {
			data = this.activeExecutions[id];
			returnData.push({
				id,
				retryOf: data.executionData.retryOf,
				startedAt: data.startedAt,
				mode: data.executionData.executionMode,
				workflowId: data.executionData.workflowData.id,
				status: data.status,
			});
		}

		return returnData;
	}

	setStatus(executionId: string, status: ExecutionStatus) {
		this.getExecution(executionId).status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		return this.getExecution(executionId).status;
	}

	/** Wait for all active executions to finish */
	async shutdown(cancelAll = false) {
		let executionIds = Object.keys(this.activeExecutions);

		if (config.getEnv('executions.mode') === 'regular') {
			// removal of active executions will no longer release capacity back,
			// so that throttled executions cannot resume during shutdown
			this.concurrencyControl.disable();
		}

		if (cancelAll) {
			if (config.getEnv('executions.mode') === 'regular') {
				await this.concurrencyControl.removeAll(this.activeExecutions);
			}

			executionIds.forEach((executionId) => this.stopExecution(executionId));
		}

		let count = 0;
		while (executionIds.length !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(`Waiting for ${executionIds.length} active executions to finish...`);
			}

			await sleep(500);
			executionIds = Object.keys(this.activeExecutions);
		}
	}

	private getExecution(executionId: string): IExecutingWorkflowData {
		const execution = this.activeExecutions[executionId];
		if (!execution && !inProduction) {
			throw new ApplicationError('No active execution found', { extra: { executionId } });
		}
		return execution;
	}
}
