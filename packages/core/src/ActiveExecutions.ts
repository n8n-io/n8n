import {
	IRun,
	IRunExecutionData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	createDeferredPromise,
	IExecutingWorkflowData,
	IExecutionsCurrentSummary,
} from '.';


export class ActiveExecutions {
	private nextId = 1;
	private activeExecutions: {
		[index: string]: IExecutingWorkflowData;
	} = {};
	private stopExecutions: string[] = [];



	/**
	 * Add a new active execution
	 *
	 * @param {Workflow} workflow
	 * @param {IRunExecutionData} runExecutionData
	 * @param {WorkflowExecuteMode} mode
	 * @returns {string}
	 * @memberof ActiveExecutions
	 */
	add(workflow: Workflow, runExecutionData: IRunExecutionData, mode: WorkflowExecuteMode): string {
		const executionId = this.nextId++;

		this.activeExecutions[executionId] = {
			runExecutionData,
			startedAt: new Date(),
			mode,
			workflow,
			postExecutePromises: [],
		};

		return executionId.toString();
	}


	/**
	 * Remove an active execution
	 *
	 * @param {string} executionId
	 * @param {IRun} fullRunData
	 * @returns {void}
	 * @memberof ActiveExecutions
	 */
	remove(executionId: string, fullRunData: IRun): void {
		if (this.activeExecutions[executionId] === undefined) {
			return;
		}

		// Resolve all the waiting promises
		for (const promise of this.activeExecutions[executionId].postExecutePromises) {
			promise.resolve(fullRunData);
		}

		// Remove from the list of active executions
		delete this.activeExecutions[executionId];

		const stopExecutionIndex = this.stopExecutions.indexOf(executionId);
		if (stopExecutionIndex !== -1) {
			// If it was on the stop-execution list remove it
			this.stopExecutions.splice(stopExecutionIndex, 1);
		}
	}


	/**
	 * Forces an execution to stop
	 *
	 * @param {string} executionId The id of the execution to stop
	 * @returns {(Promise<IRun | undefined>)}
	 * @memberof ActiveExecutions
	 */
	async stopExecution(executionId: string): Promise<IRun | undefined> {
		if (this.activeExecutions[executionId] === undefined) {
			// There is no execution running with that id
			return;
		}

		if (!this.stopExecutions.includes(executionId)) {
			// Add the execution to the stop list if it is not already on it
			this.stopExecutions.push(executionId);
		}

		return this.getPostExecutePromise(executionId);
	}



	/**
	 * Returns a promise which will resolve with the data of the execution
	 * with the given id
	 *
	 * @param {string} executionId The id of the execution to wait for
	 * @returns {Promise<IRun>}
	 * @memberof ActiveExecutions
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun> {
		// Create the promise which will be resolved when the execution finished
		const waitPromise = await createDeferredPromise<IRun>();

		if (this.activeExecutions[executionId] === undefined) {
			throw new Error(`There is no active execution with id "${executionId}".`);
		}

		this.activeExecutions[executionId].postExecutePromises.push(waitPromise);

		return waitPromise.promise();
	}



	/**
	 * Returns if the execution should be stopped
	 *
	 * @param {string} executionId The execution id to check
	 * @returns {boolean}
	 * @memberof ActiveExecutions
	 */
	shouldBeStopped(executionId: string): boolean {
		return this.stopExecutions.includes(executionId);
	}



	/**
	 * Returns all the currently active executions
	 *
	 * @returns {IExecutionsCurrentSummary[]}
	 * @memberof ActiveExecutions
	 */
	getActiveExecutions(): IExecutionsCurrentSummary[] {
		const returnData: IExecutionsCurrentSummary[] = [];

		let executionData;
		for (const id of Object.keys(this.activeExecutions)) {
			executionData = this.activeExecutions[id];
			returnData.push(
				{
					id,
					startedAt: executionData.startedAt,
					mode: executionData.mode,
					workflowId: executionData.workflow.id!,
				}
			);
		}

		return returnData;
	}
}



let activeExecutionsInstance: ActiveExecutions | undefined;

export function getInstance(): ActiveExecutions {
	if (activeExecutionsInstance === undefined) {
		activeExecutionsInstance = new ActiveExecutions();
	}

	return activeExecutionsInstance;
}
