/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container, Service } from 'typedi';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
} from 'n8n-workflow';
import { createDeferredPromise } from 'n8n-workflow';

import type { ChildProcess } from 'child_process';
import type PCancelable from 'p-cancelable';
import config from '@/config';
import type {
	IExecutingWorkflowData,
	IExecutionDb,
	IExecutionsCurrentSummary,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { isWorkflowIdValid } from '@/utils';
import { ExecutionRepository } from '@db/repositories';

const concurrencyLimit = config.getEnv('executions.concurrency');

@Service()
export class ActiveExecutions {
	private activeExecutions: {
		[index: string]: IExecutingWorkflowData;
	} = {};

	private executionQueue: Array<{ id: string; promise: Promise<unknown> }> = [];

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

			const fullExecutionData: IExecutionDb = {
				data: executionData.executionData!,
				mode: executionData.executionMode,
				finished: false,
				startedAt: new Date(),
				workflowData: executionData.workflowData,
				status: executionStatus,
			};

			if (executionData.retryOf !== undefined) {
				fullExecutionData.retryOf = executionData.retryOf.toString();
			}

			const workflowId = executionData.workflowData.id;
			if (workflowId !== undefined && isWorkflowIdValid(workflowId)) {
				fullExecutionData.workflowId = workflowId;
			}

			const executionResult = await Container.get(ExecutionRepository).createNewExecution(
				fullExecutionData,
			);
			executionId = executionResult.id;
			if (executionId === undefined) {
				throw new Error('There was an issue assigning an execution id to the execution');
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

		const postExecutePromise = await createDeferredPromise<IRun | undefined>();
		const execution: IExecutingWorkflowData = {
			executionData,
			process,
			startedAt: new Date(),
			status: executionStatus,
			postExecutePromise,
		};

		this.executionQueue.push({ id: executionId, promise: postExecutePromise.promise() });

		while (this.executionQueue.length > concurrencyLimit) {
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			await Promise.race(this.executionQueue.map(({ promise }) => promise));
		}
		console.log(`Execution ${executionId} waited ${Date.now() - execution.startedAt.getTime()}`);

		this.activeExecutions[executionId] = execution;
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
		if (execution === undefined) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		execution.responsePromise?.resolve(response);
	}

	/**
	 * Remove an active execution
	 */
	remove(executionId: string, fullRunData?: IRun): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			return;
		}

		this.executionQueue.splice(this.executionQueue.findIndex(({ id }) => id === executionId));

		// Resolve all the waiting promises
		execution.postExecutePromise.resolve(fullRunData);

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
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			// There is no execution running with that id
			return;
		}

		// In case something goes wrong make sure that promise gets first
		// returned that it gets then also resolved correctly.
		const { process } = execution;
		if (process !== undefined) {
			// Workflow is running in subprocess
			if (process.connected) {
				setTimeout(() => {
					// execute on next event loop tick;
					process.send({
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
						type: timeout || 'stopExecution',
					});
				}, 1);
			}
		} else {
			// Workflow is running in current process
			execution.workflowExecution!.cancel();
		}

		return execution.postExecutePromise.promise();
	}

	/**
	 * Returns a promise which will resolve with the data of the execution with the given id
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		return this.getExecution(executionId).postExecutePromise.promise();
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
				workflowId: data.executionData.workflowData.id!,
				status: data.status,
			});
		}

		return returnData;
	}

	async setStatus(executionId: string, status: ExecutionStatus): Promise<void> {
		this.getExecution(executionId).status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			return 'unknown';
		}

		return execution.status;
	}

	private getExecution(executionId: string) {
		if (executionId in this.activeExecutions) return this.activeExecutions[executionId];
		else throw new Error(`There is no active execution with id "${executionId}".`);
	}
}
