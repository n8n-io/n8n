/* eslint-disable prefer-template */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
} from 'n8n-workflow';
import { createDeferredPromise, LoggerProxy } from 'n8n-workflow';

import type { ChildProcess } from 'child_process';
import { stringify } from 'flatted';
import type PCancelable from 'p-cancelable';
import * as Db from '@/Db';
import type {
	IExecutingWorkflowData,
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionsCurrentSummary,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';

export class ActiveExecutions {
	private activeExecutions: {
		[index: string]: IExecutingWorkflowData;
	} = {};

	/**
	 * Add a new active execution
	 *
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
			if (workflowId !== undefined && WorkflowHelpers.isWorkflowIdValid(workflowId)) {
				fullExecutionData.workflowId = workflowId;
			}

			const execution = ResponseHelper.flattenExecutionData(fullExecutionData);

			const executionResult = await Db.collections.Execution.save(execution as IExecutionFlattedDb);
			// TODO: what is going on here?
			executionId =
				typeof executionResult.id === 'object'
					? // @ts-ignore
					  executionResult.id!.toString()
					: executionResult.id + '';
			if (executionId === undefined) {
				throw new Error('There was an issue assigning an execution id to the execution');
			}
			executionStatus = 'running';
		} else {
			// Is an existing execution we want to finish so update in DB

			const execution: Pick<IExecutionFlattedDb, 'id' | 'data' | 'waitTill' | 'status'> = {
				id: executionId,
				data: stringify(executionData.executionData!),
				waitTill: null,
				status: executionStatus,
			};

			await Db.collections.Execution.update(executionId, execution);
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
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>) {
		if (this.activeExecutions[executionId] === undefined) {
			throw new Error(
				`No active execution with id "${executionId}" got found to attach to workflowExecution to!`,
			);
		}

		this.activeExecutions[executionId].workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		if (this.activeExecutions[executionId] === undefined) {
			throw new Error(
				`No active execution with id "${executionId}" got found to attach to workflowExecution to!`,
			);
		}

		this.activeExecutions[executionId].responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		if (this.activeExecutions[executionId] === undefined) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.activeExecutions[executionId].responsePromise?.resolve(response);
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
		// eslint-disable-next-line no-restricted-syntax
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
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
						type: timeout || 'stopExecution',
					});
				}, 1);
			}
		} else {
			// Workflow is running in current process
			this.activeExecutions[executionId].workflowExecution!.cancel();
		}

		// eslint-disable-next-line consistent-return
		return this.getPostExecutePromise(executionId);
	}

	/**
	 * Returns a promise which will resolve with the data of the execution
	 * with the given id
	 *
	 * @param {string} executionId The id of the execution to wait for
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		// Create the promise which will be resolved when the execution finished
		const waitPromise = await createDeferredPromise<IRun | undefined>();

		if (this.activeExecutions[executionId] === undefined) {
			throw new Error(`There is no active execution with id "${executionId}".`);
		}

		this.activeExecutions[executionId].postExecutePromises.push(waitPromise);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
		return waitPromise.promise();
	}

	/**
	 * Returns all the currently active executions
	 *
	 */
	getActiveExecutions(): IExecutionsCurrentSummary[] {
		const returnData: IExecutionsCurrentSummary[] = [];

		let data;
		// eslint-disable-next-line no-restricted-syntax
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
			LoggerProxy.debug(
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

let activeExecutionsInstance: ActiveExecutions | undefined;

export function getInstance(): ActiveExecutions {
	if (activeExecutionsInstance === undefined) {
		activeExecutionsInstance = new ActiveExecutions();
	}

	return activeExecutionsInstance;
}
