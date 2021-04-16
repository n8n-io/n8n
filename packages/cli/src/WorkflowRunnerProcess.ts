
import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	IWorkflowExecutionDataProcessWithExecution,
	NodeTypes,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from './';

import {
	IProcessMessage,
	WorkflowExecute,
} from 'n8n-core';

import {
	ExecutionError,
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeData,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	Workflow,
	WorkflowHooks,
	WorkflowOperationError,
} from 'n8n-workflow';

import * as config from '../config';

export class WorkflowRunnerProcess {
	data: IWorkflowExecutionDataProcessWithExecution | undefined;
	startedAt = new Date();
	workflow: Workflow | undefined;
	workflowExecute: WorkflowExecute | undefined;
	executionIdCallback: (executionId: string) => void | undefined;

	static async stopProcess() {
		setTimeout(() => {
			// Attempt a graceful shutdown, giving executions 30 seconds to finish
			process.exit(0);
		}, 30000);
	}


	async runWorkflow(inputData: IWorkflowExecutionDataProcessWithExecution): Promise<IRun> {
		process.on('SIGTERM', WorkflowRunnerProcess.stopProcess);
		process.on('SIGINT', WorkflowRunnerProcess.stopProcess);

		this.data = inputData;
		let className: string;
		let tempNode: INodeType;
		let filePath: string;

		this.startedAt = new Date();

		const nodeTypesData: INodeTypeData = {};
		for (const nodeTypeName of Object.keys(this.data.nodeTypeData)) {
			className = this.data.nodeTypeData[nodeTypeName].className;

			filePath = this.data.nodeTypeData[nodeTypeName].sourcePath;
			const tempModule = require(filePath);

			try {
				tempNode = new tempModule[className]() as INodeType;
			} catch (error) {
				throw new Error(`Error loading node "${nodeTypeName}" from: "${filePath}"`);
			}

			nodeTypesData[nodeTypeName] = {
				type: tempNode,
				sourcePath: filePath,
			};
		}

		const nodeTypes = NodeTypes();
		await nodeTypes.init(nodeTypesData);

		// Init credential types the workflow uses (is needed to apply default values to credentials)
		const credentialTypes = CredentialTypes();
		await credentialTypes.init(inputData.credentialsTypeData);

		// Load the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites();
		await credentialsOverwrites.init(inputData.credentialsOverwrite);

		// Load all external hooks
		const externalHooks = ExternalHooks();
		await externalHooks.init();

		// This code has been split into 3 ifs just to make it easier to understand
		// Can be made smaller but in the end it will make it impossible to read.
		if (inputData.workflowData.settings !== undefined && inputData.workflowData.settings.saveExecutionProgress === true) {
			// Workflow settings specifying it should save
			await Db.init();
		} else if (inputData.workflowData.settings !== undefined && inputData.workflowData.settings.saveExecutionProgress !== false && config.get('executions.saveExecutionProgress') as boolean) {
			// Workflow settings not saying anything about saving but default settings says so
			await Db.init();
		} else if (inputData.workflowData.settings === undefined && config.get('executions.saveExecutionProgress') as boolean) {
			// Workflow settings not saying anything about saving but default settings says so
			await Db.init();
		}

		this.workflow = new Workflow({ id: this.data.workflowData.id as string | undefined, name: this.data.workflowData.name, nodes: this.data.workflowData!.nodes, connections: this.data.workflowData!.connections, active: this.data.workflowData!.active, nodeTypes, staticData: this.data.workflowData!.staticData, settings: this.data.workflowData!.settings });
		const additionalData = await WorkflowExecuteAdditionalData.getBase(this.data.credentials);
		additionalData.hooks = this.getProcessForwardHooks();

		const executeWorkflowFunction = additionalData.executeWorkflow;
		additionalData.executeWorkflow = async (workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, inputData?: INodeExecutionData[] | undefined): Promise<Array<INodeExecutionData[] | null> | IRun> => {
			const workflowData = await WorkflowExecuteAdditionalData.getWorkflowData(workflowInfo);
			const runData = await WorkflowExecuteAdditionalData.getRunData(workflowData, inputData);
			await sendToParentProcess('startExecution', { runData });
			const executionId: string = await new Promise((resolve) => {
				this.executionIdCallback = (executionId: string) => {
					resolve(executionId);
				};
			});
			let result: IRun;
			try {
				result = await executeWorkflowFunction(workflowInfo, additionalData, inputData, executionId, workflowData, runData);
			} catch (e) {
				await sendToParentProcess('finishExecution', { executionId });
				// Throw same error we had 
				throw e;	
			}
			
			await sendToParentProcess('finishExecution', { executionId, result });

			const returnData = WorkflowHelpers.getDataLastExecutedNodeData(result);
			return returnData!.data!.main;
		};

		if (this.data.executionData !== undefined) {
			this.workflowExecute = new WorkflowExecute(additionalData, this.data.executionMode, this.data.executionData);
			return this.workflowExecute.processRunExecutionData(this.workflow);
		} else if (this.data.runData === undefined || this.data.startNodes === undefined || this.data.startNodes.length === 0 || this.data.destinationNode === undefined) {
			// Execute all nodes

			// Can execute without webhook so go on
			this.workflowExecute = new WorkflowExecute(additionalData, this.data.executionMode);
			return this.workflowExecute.run(this.workflow, undefined, this.data.destinationNode);
		} else {
			// Execute only the nodes between start and destination nodes
			this.workflowExecute = new WorkflowExecute(additionalData, this.data.executionMode);
			return this.workflowExecute.runPartialWorkflow(this.workflow, this.data.runData, this.data.startNodes, this.data.destinationNode);
		}
	}


	/**
	 * Sends hook data to the parent process that it executes them
	 *
	 * @param {string} hook
	 * @param {any[]} parameters
	 * @memberof WorkflowRunnerProcess
	 */
	sendHookToParentProcess(hook: string, parameters: any[]) { // tslint:disable-line:no-any
		try {
			sendToParentProcess('processHook', {
				hook,
				parameters,
			});
		} catch (error) {
			// TODO: Add proper logging
			console.error(`There was a problem sending hook: "${hook}"`);
			console.error('Parameters:');
			console.error(parameters);
			console.error('Error:');
			console.error(error);
		}
	}


	/**
	 * Create a wrapper for hooks which simply forwards the data to
	 * the parent process where they then can be executed with access
	 * to database and to PushService
	 *
	 * @returns
	 */
	getProcessForwardHooks(): WorkflowHooks {
		const hookFunctions: IWorkflowExecuteHooks = {
			nodeExecuteBefore: [
				async (nodeName: string): Promise<void> => {
					this.sendHookToParentProcess('nodeExecuteBefore', [nodeName]);
				},
			],
			nodeExecuteAfter: [
				async (nodeName: string, data: ITaskData): Promise<void> => {
					this.sendHookToParentProcess('nodeExecuteAfter', [nodeName, data]);
				},
			],
			workflowExecuteBefore: [
				async (): Promise<void> => {
					this.sendHookToParentProcess('workflowExecuteBefore', []);
				},
			],
			workflowExecuteAfter: [
				async (fullRunData: IRun, newStaticData?: IDataObject): Promise<void> => {
					this.sendHookToParentProcess('workflowExecuteAfter', [fullRunData, newStaticData]);
				},
			],
		};

		const preExecuteFunctions = WorkflowExecuteAdditionalData.hookFunctionsPreExecute();
		for (const key of Object.keys(preExecuteFunctions)) {
			if (hookFunctions[key] === undefined) {
				hookFunctions[key] = [];
			}
			hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
		}

		return new WorkflowHooks(hookFunctions, this.data!.executionMode, this.data!.executionId, this.data!.workflowData, { sessionId: this.data!.sessionId, retryOf: this.data!.retryOf as string });
	}

}



/**
 * Sends data to parent process
 *
 * @param {string} type The type of data to send
 * @param {*} data The data
 * @returns {Promise<void>}
 */
async function sendToParentProcess(type: string, data: any): Promise<void> { // tslint:disable-line:no-any
	return new Promise((resolve, reject) => {
		process.send!({
			type,
			data,
		}, (error: Error) => {
			if (error) {
				return reject(error);
			}

			resolve();
		});
	});
}


const workflowRunner = new WorkflowRunnerProcess();


// Listen to messages from parent process which send the data of
// the worflow to process
process.on('message', async (message: IProcessMessage) => {
	try {
		if (message.type === 'startWorkflow') {
			const runData = await workflowRunner.runWorkflow(message.data);

			await sendToParentProcess('end', {
				runData,
			});

			// Once the workflow got executed make sure the process gets killed again
			process.exit();
		} else if (message.type === 'stopExecution' || message.type === 'timeout') {
			// The workflow execution should be stopped
			let runData: IRun;

			if (workflowRunner.workflowExecute !== undefined) {
				// Workflow started already executing
				runData = workflowRunner.workflowExecute.getFullRunData(workflowRunner.startedAt);

				const timeOutError = message.type === 'timeout' ? new WorkflowOperationError('Workflow execution timed out!') : undefined;

				// If there is any data send it to parent process, if execution timedout add the error
				await workflowRunner.workflowExecute.processSuccessExecution(workflowRunner.startedAt, workflowRunner.workflow!, timeOutError);
			} else {
				// Workflow did not get started yet
				runData = {
					data: {
						resultData: {
							runData: {},
						},
					},
					finished: message.type !== 'timeout',
					mode: workflowRunner.data!.executionMode,
					startedAt: workflowRunner.startedAt,
					stoppedAt: new Date(),
				};

				workflowRunner.sendHookToParentProcess('workflowExecuteAfter', [runData]);
			}

			await sendToParentProcess(message.type === 'timeout' ? message.type : 'end', {
				runData,
			});

			// Stop process
			process.exit();
		} else if (message.type === 'executionId') {
			workflowRunner.executionIdCallback(message.data.executionId);
		}
	} catch (error) {

		// Catch all uncaught errors and forward them to parent process
		const executionError = {
			...error,
			name: error!.name || 'Error',
			message: error!.message,
			stack: error!.stack,
		} as ExecutionError;

		await sendToParentProcess('processError', {
			executionError,
		});
		process.exit();
	}
});
