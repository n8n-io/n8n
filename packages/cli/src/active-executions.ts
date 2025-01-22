import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createDeferredPromise, ExecutionCancelledError, sleep } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import type {
	CreateExecutionPayload,
	IExecutingWorkflowData,
	IExecutionDb,
	IExecutionsCurrentSummary,
} from '@/interfaces';
import { isWorkflowIdValid } from '@/utils';

import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import config from './config';

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

			const fullExecutionData: CreateExecutionPayload = {
				data: executionData.executionData!,
				mode,
				finished: false,
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

			if (config.getEnv('executions.mode') === 'regular') {
				await this.concurrencyControl.throttle({ mode, executionId });
				await this.executionRepository.setRunning(executionId);
			}
			executionStatus = 'running';
		} else {
			// Is an existing execution we want to finish so update in DB

			await this.concurrencyControl.throttle({ mode, executionId });

			const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
				id: executionId,
				data: executionData.executionData!,
				waitTill: null,
				status: executionStatus,
				// this is resuming, so keep `startedAt` as it was
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
			.catch((error) => {
				if (error instanceof ExecutionCancelledError) return;
				throw error;
			})
			.finally(() => {
				this.concurrencyControl.release({ mode: executionData.executionMode });
				delete this.activeExecutions[executionId];
				this.logger.debug('Execution removed', { executionId });
			});

		this.logger.debug('Execution added', { executionId });

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

	/** Cancel the execution promise and reject its post-execution promise. */
	stopExecution(executionId: string): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			// There is no execution running with that id
			return;
		}
		execution.workflowExecution?.cancel();
		execution.postExecutePromise.reject(new ExecutionCancelledError(executionId));
		this.logger.debug('Execution cancelled', { executionId });
	}

	/** Resolve the post-execution promise in an execution. */
	finalizeExecution(executionId: string, fullRunData?: IRun) {
		if (!this.has(executionId)) return;
		const execution = this.getExecution(executionId);
		execution.postExecutePromise.resolve(fullRunData);
		this.logger.debug('Execution finalized', { executionId });
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
		if (!execution) {
			throw new ExecutionNotFoundError(executionId);
		}
		return execution;
	}
}
