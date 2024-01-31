import { Service } from 'typedi';
import type PCancelable from 'p-cancelable';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
} from 'n8n-workflow';
import { ApplicationError, WorkflowOperationError, createDeferredPromise } from 'n8n-workflow';

import type {
	ExecutionPayload,
	IExecutingWorkflowData,
	IExecutionDb,
	IExecutionsCurrentSummary,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { isWorkflowIdValid } from '@/utils';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { Logger } from '@/Logger';

@Service()
export class ActiveExecutions {
	private activeExecutions: {
		[index: string]: IExecutingWorkflowData;
	} = {};

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
	) {}

	/**
	 * Add a new active execution
	 */
	async add(executionData: IWorkflowExecutionDataProcess, executionId?: string): Promise<string> {
		let executionStatus: ExecutionStatus = executionId ? 'running' : 'new';
		if (executionId === undefined) {
			// Is a new execution so save in DB

			const fullExecutionData: ExecutionPayload = {
				data: executionData.executionData!,
				mode: executionData.executionMode,
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
			if (executionId === undefined) {
				throw new ApplicationError('There was an issue assigning an execution id to the execution');
			}
			executionStatus = 'running';
		} else {
			// Is an existing execution we want to finish so update in DB

			const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
				id: executionId,
				data: executionData.executionData!,
				waitTill: null,
				status: executionStatus,
			};

			await this.executionRepository.updateExistingExecution(executionId, execution);
		}

		this.activeExecutions[executionId] = {
			executionData,
			startedAt: new Date(),
			postExecutePromises: [],
			status: executionStatus,
		};

		return executionId;
	}

	/**
	 * Attaches an execution
	 *
	 */

	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>) {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			throw new ApplicationError('No active execution found to attach to workflow execution to', {
				extra: { executionId },
			});
		}

		execution.workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			throw new ApplicationError('No active execution found to attach to workflow execution to', {
				extra: { executionId },
			});
		}

		execution.responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		const execution = this.activeExecutions[executionId];
		execution?.responsePromise?.resolve(response);
	}

	getPostExecutePromiseCount(executionId: string): number {
		return this.activeExecutions[executionId]?.postExecutePromises.length ?? 0;
	}

	/**
	 * Remove an active execution
	 *
	 */
	remove(executionId: string, fullRunData?: IRun): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			return;
		}

		// Resolve all the waiting promises

		for (const promise of execution.postExecutePromises) {
			promise.resolve(fullRunData);
		}

		// Remove from the list of active executions
		delete this.activeExecutions[executionId];
	}

	/**
	 * Forces an execution to stop
	 */
	async stopExecution(executionId: string): Promise<IRun | undefined> {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			// There is no execution running with that id
			return;
		}

		execution.workflowExecution!.cancel();

		return await this.getPostExecutePromise(executionId);
	}

	/**
	 * Returns a promise which will resolve with the data of the execution
	 * with the given id
	 *
	 * @param {string} executionId The id of the execution to wait for
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			throw new WorkflowOperationError(`There is no active execution with id "${executionId}".`);
		}

		// Create the promise which will be resolved when the execution finished
		const waitPromise = await createDeferredPromise<IRun | undefined>();

		execution.postExecutePromises.push(waitPromise);

		return await waitPromise.promise();
	}

	/**
	 * Returns all the currently active executions
	 *
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

	async setStatus(executionId: string, status: ExecutionStatus): Promise<void> {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			this.logger.debug(
				`There is no active execution with id "${executionId}", can't update status to ${status}.`,
			);
			return;
		}

		execution.status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		const execution = this.activeExecutions[executionId];
		return execution?.status ?? 'unknown';
	}
}
