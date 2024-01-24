/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { Container, Service } from 'typedi';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
} from 'n8n-workflow';
import { ApplicationError, WorkflowOperationError, createDeferredPromise } from 'n8n-workflow';

import type { ChildProcess } from 'child_process';
import type PCancelable from 'p-cancelable';
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

	constructor(private readonly logger: Logger) {}

	/**
	 * Add a new active execution
	 */
	async add(
		executionData: IWorkflowExecutionDataProcess,
		process?: ChildProcess,
		executionId?: string,
	): Promise<string> {
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

			executionId = await Container.get(ExecutionRepository).createNewExecution(fullExecutionData);
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

			await Container.get(ExecutionRepository).updateExistingExecution(executionId, execution);
		}

		this.activeExecutions[executionId] = {
			executionData,
			process,
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
		if (this.activeExecutions[executionId] === undefined) {
			throw new ApplicationError('No active execution found to attach to workflow execution to', {
				extra: { executionId },
			});
		}

		this.activeExecutions[executionId].workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		if (this.activeExecutions[executionId] === undefined) {
			throw new ApplicationError('No active execution found to attach to workflow execution to', {
				extra: { executionId },
			});
		}

		this.activeExecutions[executionId].responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		if (this.activeExecutions[executionId] === undefined) {
			return;
		}

		this.activeExecutions[executionId].responsePromise?.resolve(response);
	}

	getPostExecutePromiseCount(executionId: string): number {
		return this.activeExecutions[executionId]?.postExecutePromises.length ?? 0;
	}

	/**
	 * Remove an active execution
	 *
	 */
	remove(executionId: string, fullRunData?: IRun): void {
		if (this.activeExecutions[executionId] === undefined) {
			return;
		}

		// Resolve all the waiting promises

		for (const promise of this.activeExecutions[executionId].postExecutePromises) {
			promise.resolve(fullRunData);
		}

		// Remove from the list of active executions
		delete this.activeExecutions[executionId];
	}

	/**
	 * Forces an execution to stop
	 *
	 * @param {string} executionId The id of the execution to stop
	 * @param {string} timeout String 'timeout' given if stop due to timeout
	 */
	async stopExecution(executionId: string, timeout?: string): Promise<IRun | undefined> {
		if (this.activeExecutions[executionId] === undefined) {
			// There is no execution running with that id
			return;
		}

		// In case something goes wrong make sure that promise gets first
		// returned that it gets then also resolved correctly.
		if (this.activeExecutions[executionId].process !== undefined) {
			// Workflow is running in subprocess
			if (this.activeExecutions[executionId].process!.connected) {
				setTimeout(() => {
					// execute on next event loop tick;
					this.activeExecutions[executionId].process!.send({
						type: timeout || 'stopExecution',
					});
				}, 1);
			}
		} else {
			// Workflow is running in current process
			this.activeExecutions[executionId].workflowExecution!.cancel();
		}

		return await this.getPostExecutePromise(executionId);
	}

	/**
	 * Returns a promise which will resolve with the data of the execution
	 * with the given id
	 *
	 * @param {string} executionId The id of the execution to wait for
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		if (this.activeExecutions[executionId] === undefined) {
			throw new WorkflowOperationError(`There is no active execution with id "${executionId}".`);
		}

		// Create the promise which will be resolved when the execution finished
		const waitPromise = await createDeferredPromise<IRun | undefined>();

		this.activeExecutions[executionId].postExecutePromises.push(waitPromise);

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
				retryOf: data.executionData.retryOf as string | undefined,
				startedAt: data.startedAt,
				mode: data.executionData.executionMode,
				workflowId: data.executionData.workflowData.id! as string,
				status: data.status,
			});
		}

		return returnData;
	}

	async setStatus(executionId: string, status: ExecutionStatus): Promise<void> {
		if (this.activeExecutions[executionId] === undefined) {
			this.logger.debug(
				`There is no active execution with id "${executionId}", can't update status to ${status}.`,
			);
			return;
		}

		this.activeExecutions[executionId].status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		if (this.activeExecutions[executionId] === undefined) {
			return 'unknown';
		}

		return this.activeExecutions[executionId].status;
	}
}
