
import {
	ActiveExecutions,
	IProcessMessageDataHook,
	ITransferNodeTypes,
	IWorkflowExecutionDataProcess,
	IWorkflowExecutionDataProcessWithExecution,
	NodeTypes,
	Push,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from './';

import {
	IProcessMessage,
} from 'n8n-core';

import {
	IExecutionError,
	INode,
	IRun,
	IWorkflowExecuteHooks,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { join as pathJoin } from 'path';
import { fork } from 'child_process';


export class WorkflowRunner {
	activeExecutions: ActiveExecutions.ActiveExecutions;
	push: Push.Push;


	constructor() {
		this.push = Push.getInstance();
		this.activeExecutions = ActiveExecutions.getInstance();
	}


	/**
	 * Returns the data of the node types that are needed
	 * to execute the given nodes
	 *
	 * @param {INode[]} nodes
	 * @returns {ITransferNodeTypes}
	 * @memberof WorkflowRunner
	 */
	getNodeTypeData(nodes: INode[]): ITransferNodeTypes {
		const nodeTypes = NodeTypes();

		// Check which node-types have to be loaded
		const neededNodeTypes: string[] = [];
		for (const node of nodes) {
			if (!neededNodeTypes.includes(node.type)) {
				neededNodeTypes.push(node.type);
			}
		}

		// Get all the data of the needed node types that they
		// can be loaded again in the process
		const returnData: ITransferNodeTypes = {};
		for (const nodeTypeName of neededNodeTypes) {
			if (nodeTypes.nodeTypes[nodeTypeName] === undefined) {
				throw new Error(`The NodeType "${nodeTypeName}" could not be found!`);
			}

			returnData[nodeTypeName] = {
				className: nodeTypes.nodeTypes[nodeTypeName].type.constructor.name,
				sourcePath: nodeTypes.nodeTypes[nodeTypeName].sourcePath,
			};
		}

		return returnData;
	}


	/**
	 * The process did send a hook message so execute the appropiate hook
	 *
	 * @param {IWorkflowExecuteHooks} hookFunctions
	 * @param {IProcessMessageDataHook} hookData
	 * @memberof WorkflowRunner
	 */
	processHookMessage(hookFunctions: IWorkflowExecuteHooks, hookData: IProcessMessageDataHook) {
		if (hookFunctions[hookData.hook] !== undefined && Array.isArray(hookFunctions[hookData.hook])) {

			for (const hookFunction of hookFunctions[hookData.hook]!) {
				// TODO: Not sure if that is 100% correct or something is still missing like to wait
				hookFunction.apply(this, hookData.parameters)
					.catch((error: Error) => {
						// Catch all errors here because when "executeHook" gets called
						// we have the most time no "await" and so the errors would so
						// not be uncaught by anything.

						// TODO: Add proper logging
						console.error(`There was a problem executing hook: "${hookData.hook}"`);
						console.error('Parameters:');
						console.error(hookData.parameters);
						console.error('Error:');
						console.error(error);
					});
			}
		}
	}


	/**
	 * The process did error
	 *
	 * @param {IExecutionError} error
	 * @param {Date} startedAt
	 * @param {WorkflowExecuteMode} executionMode
	 * @param {string} executionId
	 * @memberof WorkflowRunner
	 */
	processError(error: IExecutionError, startedAt: Date, executionMode: WorkflowExecuteMode, executionId: string) {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode: executionMode,
			startedAt,
			stoppedAt: new Date(),
		};

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.remove(executionId, fullRunData);

		// Also send to Editor UI
		WorkflowExecuteAdditionalData.pushExecutionFinished(fullRunData, executionId);
	}


	/**
	 * Run the workflow in subprocess
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async run(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean): Promise<string> {
		const startedAt = new Date();
		const subprocess = fork(pathJoin(__dirname, 'WorkflowRunnerProcess.js'));

		if (loadStaticData === true && data.workflowData.id) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(data.workflowData.id as string);
		}

		// Register the active execution
		const executionId = this.activeExecutions.add(subprocess, data);

		const nodeTypeData = this.getNodeTypeData(data.workflowData.nodes);

		(data as unknown as IWorkflowExecutionDataProcessWithExecution).executionId = executionId;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).nodeTypeData = nodeTypeData;

		const hookFunctions = WorkflowExecuteAdditionalData.getHookMethods(data, executionId);

		// Send all data to subprocess it needs to run the workflow
		subprocess.send({ type: 'startWorkflow', data } as IProcessMessage);

		// Listen to data from the subprocess
		subprocess.on('message', (message: IProcessMessage) => {
			if (message.type === 'end') {
				this.activeExecutions.remove(executionId!, message.data.runData);
			} else if (message.type === 'processError') {

				const executionError = message.data.executionError as IExecutionError;

				this.processError(executionError, startedAt, data.executionMode, executionId);

			} else if (message.type === 'processHook') {
				this.processHookMessage(hookFunctions, message.data as IProcessMessageDataHook);
			}
		});

		// Also get informed when the processes does exit especially when it did crash
		subprocess.on('exit', (code, signal) => {
			if (code !== 0) {
				// Process did exit with error code, so something went wrong.
				const executionError = {
					message: 'Workflow execution process did crash for an unknown reason!',
				} as IExecutionError;

				this.processError(executionError, startedAt, data.executionMode, executionId);
			}
		});

		return executionId;
	}
}
