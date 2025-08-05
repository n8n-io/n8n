import { Logger } from '@n8n/backend-common';
import type { CreateExecutionPayload, IExecutionDb } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
} from 'n8n-workflow';
import { createDeferredPromise, ExecutionCancelledError, sleep } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';

import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import type { IExecutingWorkflowData, IExecutionsCurrentSummary } from '@/interfaces';
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

			fullExecutionData.retryOf = executionData.retryOf ?? undefined;

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

		const resumingExecution = this.activeExecutions[executionId];
		const postExecutePromise = createDeferredPromise<IRun | undefined>();

		const execution: IExecutingWorkflowData = {
			executionData,
			startedAt: resumingExecution?.startedAt ?? new Date(),
			postExecutePromise,
			status: executionStatus,
			responsePromise: resumingExecution?.responsePromise,
			httpResponse: executionData.httpResponse ?? undefined,
		};
		this.activeExecutions[executionId] = execution;

		// Automatically remove execution once the postExecutePromise settles
		void postExecutePromise.promise
			.catch((error) => {
				if (error instanceof ExecutionCancelledError) return;
				throw error;
			})
			.finally(() => {
				this.concurrencyControl.release({ mode: executionData.executionMode });
				if (execution.status === 'waiting') {
					// Do not hold on a reference to the previous WorkflowExecute instance, since a resuming execution will use a new instance
					delete execution.workflowExecution;
				} else {
					delete this.activeExecutions[executionId];
					this.logger.debug('Execution removed', { executionId });
				}
			});

		this.logger.debug('Execution added', { executionId });

		return executionId;
	}

	/**
	 * Attaches an execution
	 */

	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>) {
		this.getExecutionOrFail(executionId).workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		this.getExecutionOrFail(executionId).responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		const execution = this.activeExecutions[executionId];
		execution?.responsePromise?.resolve(response);
	}

	/** Used for sending a chunk to a streaming response */
	sendChunk(executionId: string, chunkText: StructuredChunk): void {
		const execution = this.activeExecutions[executionId];
		if (execution?.httpResponse) {
			execution?.httpResponse.write(JSON.stringify(chunkText) + '\n');
			execution?.httpResponse.flush();
		}
	}

	/** Cancel the execution promise and reject its post-execution promise. */
	stopExecution(executionId: string): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			// There is no execution running with that id
			return;
		}
		const error = new ExecutionCancelledError(executionId);
		execution.responsePromise?.reject(error);
		if (execution.status === 'waiting') {
			// A waiting execution will not have a valid workflowExecution or postExecutePromise
			// So we can't rely on the `.finally` on the postExecutePromise for the execution removal
			delete this.activeExecutions[executionId];
		} else {
			execution.workflowExecution?.cancel();
			execution.postExecutePromise.reject(error);
		}
		this.logger.debug('Execution cancelled', { executionId });
	}

	/** Resolve the post-execution promise in an execution. */
	finalizeExecution(executionId: string, fullRunData?: IRun) {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		// Close response if it exists (for streaming responses)
		if (execution.executionData.httpResponse) {
			try {
				this.logger.debug('Closing response for execution', { executionId });
				execution.executionData.httpResponse.end();
			} catch (error) {
				this.logger.error('Error closing streaming response', {
					executionId,
					error: (error as Error).message,
				});
			}
		}

		execution.postExecutePromise.resolve(fullRunData);
		this.logger.debug('Execution finalized', { executionId });
	}

	/** Resolve the response promise in an execution. */
	resolveExecutionResponsePromise(executionId: string) {
		// TODO: This should probably be refactored.
		// The reason for adding this method is that the Form node works in 'responseNode' mode
		// and expects the next Form to 'sendResponse' to redirect to the current Form node.
		// Resolving responsePromise here is needed to complete the redirection chain; otherwise, a manual reload will be required.

		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		if (execution.status !== 'waiting' && execution?.responsePromise) {
			execution.responsePromise.resolve({});
			this.logger.debug('Execution response promise cleaned', { executionId });
		}
	}

	/**
	 * Returns a promise which will resolve with the data of the execution with the given id
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		return await this.getExecutionOrFail(executionId).postExecutePromise.promise;
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
				retryOf: data.executionData.retryOf ?? undefined,
				startedAt: data.startedAt,
				mode: data.executionData.executionMode,
				workflowId: data.executionData.workflowData.id,
				status: data.status,
			});
		}

		return returnData;
	}

	setStatus(executionId: string, status: ExecutionStatus) {
		this.getExecutionOrFail(executionId).status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		return this.getExecutionOrFail(executionId).status;
	}

	/** Wait for all active executions to finish */
	async shutdown(cancelAll = false) {
		const isRegularMode = config.getEnv('executions.mode') === 'regular';
		if (isRegularMode) {
			// removal of active executions will no longer release capacity back,
			// so that throttled executions cannot resume during shutdown
			this.concurrencyControl.disable();
		}

		let executionIds = Object.keys(this.activeExecutions);
		const toCancel: string[] = [];
		for (const executionId of executionIds) {
			const { responsePromise, status } = this.activeExecutions[executionId];
			if (!!responsePromise || (isRegularMode && cancelAll)) {
				// Cancel all exectutions that have a response promise, because these promises can't be retained between restarts
				this.stopExecution(executionId);
				toCancel.push(executionId);
			} else if (status === 'waiting' || status === 'new') {
				// Remove waiting and new executions to not block shutdown
				delete this.activeExecutions[executionId];
			}
		}

		await this.concurrencyControl.removeAll(toCancel);

		let count = 0;
		executionIds = Object.keys(this.activeExecutions);
		while (executionIds.length !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(`Waiting for ${executionIds.length} active executions to finish...`);
			}

			await sleep(500);
			executionIds = Object.keys(this.activeExecutions);
		}
	}

	/** Pause an active execution */
	pauseExecution(executionId: string): boolean {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return false;
		}

		if (execution.status === 'running') {
			execution.status = 'waiting';
			// Pause the workflow execution if it exists
			if (execution.workflowExecution) {
				// The actual pausing will be handled by the workflow execution engine
				// through the abortController or other mechanisms
			}
			this.logger.debug('Execution paused', { executionId });
			return true;
		}

		return false;
	}

	/** Resume a paused execution */
	resumeExecution(executionId: string): boolean {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return false;
		}

		if (execution.status === 'waiting') {
			execution.status = 'running';
			// Resume the workflow execution if it exists
			if (execution.workflowExecution) {
				// The actual resuming will be handled by the workflow execution engine
			}
			this.logger.debug('Execution resumed', { executionId });
			return true;
		}

		return false;
	}

	/** Get execution status information */
	getExecutionStatus(
		executionId: string,
	): { status: ExecutionStatus; currentNode?: string } | null {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return null;
		}

		const currentNode = execution.executionData?.executionData?.resultData?.lastNodeExecuted;
		return {
			status: execution.status,
			currentNode,
		};
	}

	/** Check if an execution can be paused */
	canPause(executionId: string): boolean {
		const execution = this.activeExecutions[executionId];
		return execution?.status === 'running';
	}

	/** Check if an execution can be resumed */
	canResume(executionId: string): boolean {
		const execution = this.activeExecutions[executionId];
		return execution?.status === 'waiting';
	}

	/** Step through execution by specified number of steps */
	stepExecution(
		executionId: string,
		steps: number = 1,
		nodeNames?: string[],
	): {
		stepsExecuted: number;
		currentNode?: string;
		nextNodes: string[];
	} {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return { stepsExecuted: 0, nextNodes: [] };
		}

		// For now, we simulate stepping by tracking state
		// In a full implementation, this would coordinate with the WorkflowExecute engine
		const currentNode = execution.executionData?.executionData?.resultData?.lastNodeExecuted;

		// Calculate next nodes based on workflow structure
		const nextNodes = nodeNames || this.getNextNodesToExecute(execution, currentNode);

		this.logger.debug('Execution stepped', {
			executionId,
			steps,
			currentNode,
			nextNodes,
		});

		return {
			stepsExecuted: Math.min(steps, nextNodes.length),
			currentNode,
			nextNodes: nextNodes.slice(0, steps),
		};
	}

	/** Get next nodes to execute from current position */
	private getNextNodesToExecute(execution: IExecutingWorkflowData, currentNode?: string): string[] {
		const workflowData = execution.executionData.workflowData;
		const connections = workflowData.connections;

		if (!currentNode || !connections[currentNode]) {
			// If no current node, return starting nodes
			return workflowData.nodes
				.filter(
					(node) =>
						!Object.keys(connections).some((conn) =>
							connections[conn]?.main?.some((outputs) =>
								outputs?.some((output) => output?.node === node.name),
							),
						),
				)
				.map((node) => node.name);
		}

		// Get connected nodes from current node
		const nextNodes: string[] = [];
		const nodeConnections = connections[currentNode];

		if (nodeConnections?.main) {
			for (const outputs of nodeConnections.main) {
				if (outputs) {
					for (const connection of outputs) {
						if (connection?.node) {
							nextNodes.push(connection.node);
						}
					}
				}
			}
		}

		return [...new Set(nextNodes)]; // Remove duplicates
	}

	/** Check if execution can be stepped */
	canStep(executionId: string): boolean {
		const execution = this.activeExecutions[executionId];
		return execution?.status === 'running' || execution?.status === 'waiting';
	}

	/** Cancel execution at node level */
	cancelNodeExecution(executionId: string, nodeName: string): boolean {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return false;
		}

		// Mark the specific node as cancelled in the execution data
		if (execution.executionData?.executionData?.resultData?.runData) {
			const runData = execution.executionData.executionData.resultData.runData;

			// If node has run data, mark the last run as cancelled
			if (runData[nodeName] && runData[nodeName].length > 0) {
				const lastRun = runData[nodeName][runData[nodeName].length - 1];
				lastRun.error = {
					message: `Node execution cancelled`,
					name: 'NodeExecutionCancelled',
					timestamp: Date.now(),
				} as any;
			}
		}

		this.logger.debug('Node execution cancelled', { executionId, nodeName });
		return true;
	}

	/** Skip node execution and provide mock output */
	skipNodeExecution(executionId: string, nodeName: string, mockOutput?: any): boolean {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return false;
		}

		// Add mock run data for the skipped node
		if (execution.executionData?.executionData?.resultData?.runData) {
			const runData = execution.executionData.executionData.resultData.runData;

			runData[nodeName] = [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 0,
					data: {
						main: mockOutput ? [[{ json: mockOutput, pairedItem: { item: 0 } }]] : [[]],
					},
					source: [],
				},
			];
		}

		this.logger.debug('Node execution skipped', { executionId, nodeName });
		return true;
	}

	/** Retry node execution with modified parameters */
	retryNodeExecution(
		executionId: string,
		nodeName: string,
		modifiedParameters?: any,
		resetState?: boolean,
	): boolean {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return false;
		}

		// Reset node state if requested
		if (resetState && execution.executionData?.executionData?.resultData?.runData) {
			const runData = execution.executionData.executionData.resultData.runData;
			delete runData[nodeName];
		}

		// Apply modified parameters to the workflow node
		if (modifiedParameters) {
			const workflowData = execution.executionData.workflowData;
			const node = workflowData.nodes.find((n) => n.name === nodeName);
			if (node) {
				node.parameters = {
					...node.parameters,
					...modifiedParameters,
				};
			}
		}

		this.logger.debug('Node execution retry initiated', { executionId, nodeName, resetState });
		return true;
	}

	/** Get node execution status */
	getNodeExecutionStatus(
		executionId: string,
		nodeName: string,
	): {
		status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
		executionTime?: number;
		error?: any;
	} | null {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			return null;
		}

		const runData = execution.executionData?.executionData?.resultData?.runData;
		if (!runData || !runData[nodeName] || runData[nodeName].length === 0) {
			return { status: 'pending' };
		}

		const lastRun = runData[nodeName][runData[nodeName].length - 1];

		if (lastRun.error) {
			return {
				status: 'error',
				executionTime: lastRun.executionTime,
				error: lastRun.error,
			};
		}

		return {
			status: 'success',
			executionTime: lastRun.executionTime,
		};
	}

	getExecutionOrFail(executionId: string): IExecutingWorkflowData {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			throw new ExecutionNotFoundError(executionId);
		}
		return execution;
	}
}
