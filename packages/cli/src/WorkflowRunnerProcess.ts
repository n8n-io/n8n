/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/unbound-method */
import {
	BinaryDataManager,
	IBinaryDataConfig,
	IProcessMessage,
	UserSettings,
	WorkflowExecute,
} from 'n8n-core';

import {
	ExecutionError,
	IDataObject,
	IExecuteResponsePromiseData,
	IExecuteWorkflowInfo,
	ILogger,
	INodeExecutionData,
	INodeType,
	INodeTypeData,
	IRun,
	ITaskData,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	LoggerProxy,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
	WorkflowOperationError,
} from 'n8n-workflow';
import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	GenericHelpers,
	IWorkflowExecuteProcess,
	IWorkflowExecutionDataProcessWithExecution,
	NodeTypes,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from '.';

import { getLogger } from './Logger';

import * as config from '../config';
import { InternalHooksManager } from './InternalHooksManager';

export class WorkflowRunnerProcess {
	data: IWorkflowExecutionDataProcessWithExecution | undefined;

	logger: ILogger;

	startedAt = new Date();

	workflow: Workflow | undefined;

	workflowExecute: WorkflowExecute | undefined;

	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	executionIdCallback: (executionId: string) => void | undefined;

	childExecutions: {
		[key: string]: IWorkflowExecuteProcess;
	} = {};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess() {
		setTimeout(() => {
			// Attempt a graceful shutdown, giving executions 30 seconds to finish
			process.exit(0);
		}, 30000);
	}

	async runWorkflow(inputData: IWorkflowExecutionDataProcessWithExecution): Promise<IRun> {
		process.on('SIGTERM', WorkflowRunnerProcess.stopProcess);
		process.on('SIGINT', WorkflowRunnerProcess.stopProcess);

		// eslint-disable-next-line no-multi-assign
		const logger = (this.logger = getLogger());
		LoggerProxy.init(logger);

		this.data = inputData;

		logger.verbose('Initializing n8n sub-process', {
			pid: process.pid,
			workflowId: this.data.workflowData.id,
		});

		let className: string;
		let tempNode: INodeType;
		let filePath: string;

		this.startedAt = new Date();

		const nodeTypesData: INodeTypeData = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeName of Object.keys(this.data.nodeTypeData)) {
			className = this.data.nodeTypeData[nodeTypeName].className;

			filePath = this.data.nodeTypeData[nodeTypeName].sourcePath;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, import/no-dynamic-require, global-require, @typescript-eslint/no-var-requires
			const tempModule = require(filePath);

			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				const nodeObject = new tempModule[className]();
				if (nodeObject.getNodeType !== undefined) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					tempNode = nodeObject.getNodeType();
				} else {
					tempNode = nodeObject;
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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

		const instanceId = (await UserSettings.prepareUserSettings()).instanceId ?? '';
		const { cli } = await GenericHelpers.getVersions();
		InternalHooksManager.init(instanceId, cli, nodeTypes);

		const binaryDataConfig = config.get('binaryDataManager') as IBinaryDataConfig;
		await BinaryDataManager.init(binaryDataConfig);

		// Credentials should now be loaded from database.
		// We check if any node uses credentials. If it does, then
		// init database.
		let shouldInitializaDb = false;
		// eslint-disable-next-line array-callback-return
		inputData.workflowData.nodes.map((node) => {
			if (Object.keys(node.credentials === undefined ? {} : node.credentials).length > 0) {
				shouldInitializaDb = true;
			}
		});

		// This code has been split into 4 ifs just to make it easier to understand
		// Can be made smaller but in the end it will make it impossible to read.
		if (shouldInitializaDb) {
			// initialize db as we need to load credentials
			await Db.init();
		} else if (
			inputData.workflowData.settings !== undefined &&
			inputData.workflowData.settings.saveExecutionProgress === true
		) {
			// Workflow settings specifying it should save
			await Db.init();
		} else if (
			inputData.workflowData.settings !== undefined &&
			inputData.workflowData.settings.saveExecutionProgress !== false &&
			(config.get('executions.saveExecutionProgress') as boolean)
		) {
			// Workflow settings not saying anything about saving but default settings says so
			await Db.init();
		} else if (
			inputData.workflowData.settings === undefined &&
			(config.get('executions.saveExecutionProgress') as boolean)
		) {
			// Workflow settings not saying anything about saving but default settings says so
			await Db.init();
		}

		// Start timeout for the execution
		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
		if (this.data.workflowData.settings && this.data.workflowData.settings.executionTimeout) {
			workflowTimeout = this.data.workflowData.settings.executionTimeout as number; // preference on workflow setting
		}

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number);
		}

		this.workflow = new Workflow({
			id: this.data.workflowData.id as string | undefined,
			name: this.data.workflowData.name,
			nodes: this.data.workflowData.nodes,
			connections: this.data.workflowData.connections,
			active: this.data.workflowData.active,
			nodeTypes,
			staticData: this.data.workflowData.staticData,
			settings: this.data.workflowData.settings,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			undefined,
			workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
		);
		additionalData.hooks = this.getProcessForwardHooks();

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				await sendToParentProcess('sendResponse', {
					response: WebhookHelpers.encodeWebhookResponse(response),
				});
			},
		];

		additionalData.executionId = inputData.executionId;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		additionalData.sendMessageToUI = async (source: string, message: any) => {
			if (workflowRunner.data!.executionMode !== 'manual') {
				return;
			}

			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				await sendToParentProcess('sendMessageToUI', { source, message });
			} catch (error) {
				this.logger.error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
					`There was a problem sending UI data to parent process: "${error.message}"`,
				);
			}
		};
		const executeWorkflowFunction = additionalData.executeWorkflow;
		additionalData.executeWorkflow = async (
			workflowInfo: IExecuteWorkflowInfo,
			additionalData: IWorkflowExecuteAdditionalData,
			inputData?: INodeExecutionData[] | undefined,
		): Promise<Array<INodeExecutionData[] | null> | IRun> => {
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
				const executeWorkflowFunctionOutput = (await executeWorkflowFunction(
					workflowInfo,
					additionalData,
					inputData,
					executionId,
					workflowData,
					runData,
				)) as { workflowExecute: WorkflowExecute; workflow: Workflow } as IWorkflowExecuteProcess;
				const { workflowExecute } = executeWorkflowFunctionOutput;
				this.childExecutions[executionId] = executeWorkflowFunctionOutput;
				const { workflow } = executeWorkflowFunctionOutput;
				result = await workflowExecute.processRunExecutionData(workflow);
				await externalHooks.run('workflow.postExecute', [result, workflowData, executionId]);
				void InternalHooksManager.getInstance().onWorkflowPostExecute(
					executionId,
					workflowData,
					result,
				);
				await sendToParentProcess('finishExecution', { executionId, result });
				delete this.childExecutions[executionId];
			} catch (e) {
				await sendToParentProcess('finishExecution', { executionId });
				delete this.childExecutions[executionId];
				// Throw same error we had
				throw e;
			}

			await sendToParentProcess('finishExecution', { executionId, result });

			const returnData = WorkflowHelpers.getDataLastExecutedNodeData(result);
			return returnData!.data!.main;
		};

		if (this.data.executionData !== undefined) {
			this.workflowExecute = new WorkflowExecute(
				additionalData,
				this.data.executionMode,
				this.data.executionData,
			);
			return this.workflowExecute.processRunExecutionData(this.workflow);
		}
		if (
			this.data.runData === undefined ||
			this.data.startNodes === undefined ||
			this.data.startNodes.length === 0 ||
			this.data.destinationNode === undefined
		) {
			// Execute all nodes

			// Can execute without webhook so go on
			this.workflowExecute = new WorkflowExecute(additionalData, this.data.executionMode);
			return this.workflowExecute.run(this.workflow, undefined, this.data.destinationNode);
		}
		// Execute only the nodes between start and destination nodes
		this.workflowExecute = new WorkflowExecute(additionalData, this.data.executionMode);
		return this.workflowExecute.runPartialWorkflow(
			this.workflow,
			this.data.runData,
			this.data.startNodes,
			this.data.destinationNode,
		);
	}

	/**
	 * Sends hook data to the parent process that it executes them
	 *
	 * @param {string} hook
	 * @param {any[]} parameters
	 * @memberof WorkflowRunnerProcess
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
	async sendHookToParentProcess(hook: string, parameters: any[]) {
		try {
			await sendToParentProcess('processHook', {
				hook,
				parameters,
			});
		} catch (error) {
			this.logger.error(`There was a problem sending hook: "${hook}"`, { parameters, error });
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
					await this.sendHookToParentProcess('nodeExecuteBefore', [nodeName]);
				},
			],
			nodeExecuteAfter: [
				async (nodeName: string, data: ITaskData): Promise<void> => {
					await this.sendHookToParentProcess('nodeExecuteAfter', [nodeName, data]);
				},
			],
			workflowExecuteBefore: [
				async (): Promise<void> => {
					await this.sendHookToParentProcess('workflowExecuteBefore', []);
				},
			],
			workflowExecuteAfter: [
				async (fullRunData: IRun, newStaticData?: IDataObject): Promise<void> => {
					await this.sendHookToParentProcess('workflowExecuteAfter', [fullRunData, newStaticData]);
				},
			],
		};

		const preExecuteFunctions = WorkflowExecuteAdditionalData.hookFunctionsPreExecute();
		// eslint-disable-next-line no-restricted-syntax
		for (const key of Object.keys(preExecuteFunctions)) {
			if (hookFunctions[key] === undefined) {
				hookFunctions[key] = [];
			}
			hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
		}

		return new WorkflowHooks(
			hookFunctions,
			this.data!.executionMode,
			this.data!.executionId,
			this.data!.workflowData,
			{ sessionId: this.data!.sessionId, retryOf: this.data!.retryOf as string },
		);
	}
}

/**
 * Sends data to parent process
 *
 * @param {string} type The type of data to send
 * @param {*} data The data
 * @returns {Promise<void>}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendToParentProcess(type: string, data: any): Promise<void> {
	return new Promise((resolve, reject) => {
		process.send!(
			{
				type,
				data,
			},
			(error: Error) => {
				if (error) {
					return reject(error);
				}

				resolve();
			},
		);
	});
}

const workflowRunner = new WorkflowRunnerProcess();

// Listen to messages from parent process which send the data of
// the worflow to process
process.on('message', async (message: IProcessMessage) => {
	try {
		if (message.type === 'startWorkflow') {
			await sendToParentProcess('start', {});

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
				const executionIds = Object.keys(workflowRunner.childExecutions);

				// eslint-disable-next-line no-restricted-syntax
				for (const executionId of executionIds) {
					const childWorkflowExecute = workflowRunner.childExecutions[executionId];
					runData = childWorkflowExecute.workflowExecute.getFullRunData(
						workflowRunner.childExecutions[executionId].startedAt,
					);
					const timeOutError =
						message.type === 'timeout'
							? new WorkflowOperationError('Workflow execution timed out!')
							: new WorkflowOperationError('Workflow-Execution has been canceled!');

					// If there is any data send it to parent process, if execution timedout add the error
					// eslint-disable-next-line no-await-in-loop
					await childWorkflowExecute.workflowExecute.processSuccessExecution(
						workflowRunner.childExecutions[executionId].startedAt,
						childWorkflowExecute.workflow,
						timeOutError,
					);
				}

				// Workflow started already executing
				runData = workflowRunner.workflowExecute.getFullRunData(workflowRunner.startedAt);

				const timeOutError =
					message.type === 'timeout'
						? new WorkflowOperationError('Workflow execution timed out!')
						: new WorkflowOperationError('Workflow-Execution has been canceled!');

				// If there is any data send it to parent process, if execution timedout add the error
				await workflowRunner.workflowExecute.processSuccessExecution(
					workflowRunner.startedAt,
					workflowRunner.workflow!,
					timeOutError,
				);
			} else {
				// Workflow did not get started yet
				runData = {
					data: {
						resultData: {
							runData: {},
						},
					},
					finished: false,
					mode: workflowRunner.data
						? workflowRunner.data.executionMode
						: ('own' as WorkflowExecuteMode),
					startedAt: workflowRunner.startedAt,
					stoppedAt: new Date(),
				};

				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				workflowRunner.sendHookToParentProcess('workflowExecuteAfter', [runData]);
			}

			await sendToParentProcess(message.type === 'timeout' ? message.type : 'end', {
				runData,
			});

			// Stop process
			process.exit();
		} else if (message.type === 'executionId') {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			workflowRunner.executionIdCallback(message.data.executionId);
		}
	} catch (error) {
		// Catch all uncaught errors and forward them to parent process
		const executionError = {
			...error,
			name: error.name || 'Error',
			message: error.message,
			stack: error.stack,
		} as ExecutionError;

		await sendToParentProcess('processError', {
			executionError,
		});
		process.exit();
	}
});
