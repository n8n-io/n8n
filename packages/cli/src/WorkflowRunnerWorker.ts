/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expose, isWorkerRuntime } from 'threads';
import { Observable, Subject } from 'threads/observable';
import config from '@/config';
import * as Db from '@/Db';
import type {
	IWorkflowExecutionDataProcessWithExecution,
	IPushDataConsoleMessage,
	IWorkflowExecuteProcess,
	IProcessMessageDataHook,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import {
	ErrorReporterProxy as ErrorReporter,
	ExecutionError,
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	ITaskData,
	IWorkflowExecuteHooks,
	Workflow,
	WorkflowExecuteMode,
	LoggerProxy,
	WorkflowOperationError,
	WorkflowHooks,
	NodeOperationError,
	IExecuteWorkflowInfo,
	IWorkflowExecuteAdditionalData,
	INodeExecutionData,
	IWorkflowSettings,
	ILogger,
} from 'n8n-workflow';
import {
	CredentialsOverwrites,
	CredentialTypes,
	ExternalHooks,
	GenericHelpers,
	InternalHooksManager,
	LoadNodesAndCredentials,
	NodeTypes,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from '.';
import { initErrorHandling } from './ErrorReporting';
import { getLogger } from './Logger';
import { getLicense } from './License';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import { BinaryDataManager, UserSettings, WorkflowExecute } from 'n8n-core';
import { generateFailedExecutionFromError } from './WorkflowHelpers';

const messageToParent = new Subject<{
	type: string;
	data?:
		| IRun
		| IExecuteResponsePromiseData
		| IWorkflowExecutionDataProcess
		| { executionId: string; result: IRun };
}>();
const hookToParent = new Subject<IProcessMessageDataHook>();
const processErrors = new Subject<ExecutionError>();
const messageToUi = new Subject<IPushDataConsoleMessage>();
// const workflowRunner = new WorkflowRunnerWorkerProcess();

let workflowRunnerData: IWorkflowExecutionDataProcessWithExecution | undefined;
let workflowRunnerLogger: ILogger;
let workflowRunnerStartedAt = new Date();
let workflowRunnerWorkflow: Workflow | undefined;
let workflowRunnerWorkflowExecute: WorkflowExecute | undefined;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
let workflowRunnerExecutionIdCallback: (executionId: string) => void | undefined;
const workflowRunnerChildExecutions: {
	[key: string]: IWorkflowExecuteProcess;
} = {};

function closeUpShop(errorCode?: number): void {
	LoggerProxy.debug('Closing up shop');
	processErrors.complete();
	messageToParent.complete();
	messageToUi.complete();
	hookToParent.complete();
	// Make sure the process gets killed again
	process.exit(errorCode);
}

async function stopProcessWithTimeout() {
	setTimeout(() => {
		// Attempt a graceful shutdown, giving executions 30 seconds to finish
		closeUpShop(0);
	}, 30000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendProcessError(error: any): void {
	processErrors.next({
		...error,
		name: error.name || 'Error',
		message: error.message,
		stack: error.stack,
	} as ExecutionError);
	closeUpShop();
}

/**
 * Create a wrapper for hooks which simply forwards the data to
 * the parent process where they then can be executed with access
 * to database and to PushService
 *
 */
function getProcessForwardHooks(): WorkflowHooks {
	const hookFunctions: IWorkflowExecuteHooks = {
		nodeExecuteBefore: [
			async (nodeName: string): Promise<void> => {
				hookToParent.next({ hook: 'nodeExecuteBefore', parameters: [nodeName] });
			},
		],
		nodeExecuteAfter: [
			async (nodeName: string, data: ITaskData): Promise<void> => {
				hookToParent.next({ hook: 'nodeExecuteAfter', parameters: [nodeName, data] });
			},
		],
		workflowExecuteBefore: [
			async (): Promise<void> => {
				hookToParent.next({ hook: 'workflowExecuteBefore', parameters: [] });
			},
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun, newStaticData?: IDataObject): Promise<void> => {
				hookToParent.next({
					hook: 'workflowExecuteAfter',
					parameters: [fullRunData, newStaticData],
				});
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				hookToParent.next({ hook: 'nodeFetchedData', parameters: [workflowId, node] });
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
		workflowRunnerData!.executionMode,
		workflowRunnerData!.executionId,
		workflowRunnerData!.workflowData,
		{ sessionId: workflowRunnerData!.sessionId, retryOf: workflowRunnerData!.retryOf as string },
	);
}

async function runWorkflow(inputData: IWorkflowExecutionDataProcessWithExecution): Promise<IRun> {
	process.once('SIGTERM', stopProcessWithTimeout);
	process.once('SIGINT', stopProcessWithTimeout);

	await initErrorHandling();

	// eslint-disable-next-line no-multi-assign
	workflowRunnerLogger = getLogger();
	LoggerProxy.init(workflowRunnerLogger);

	workflowRunnerData = inputData;
	const { userId } = inputData;

	workflowRunnerLogger.verbose('Initializing n8n sub-process', {
		pid: process.pid,
		workflowId: workflowRunnerData.workflowData.id,
	});

	workflowRunnerStartedAt = new Date();

	const loadNodesAndCredentials = LoadNodesAndCredentials();
	await loadNodesAndCredentials.init();

	const nodeTypes = NodeTypes(loadNodesAndCredentials);
	const credentialTypes = CredentialTypes(loadNodesAndCredentials);

	// Load the credentials overwrites if any exist
	const credentialsOverwrites = CredentialsOverwrites(credentialTypes);
	await credentialsOverwrites.init();

	// Load all external hooks
	const externalHooks = ExternalHooks();
	await externalHooks.init();

	const instanceId = (await UserSettings.prepareUserSettings()).instanceId ?? '';
	const { cli } = await GenericHelpers.getVersions();
	await InternalHooksManager.init(instanceId, cli, nodeTypes);

	const binaryDataConfig = config.getEnv('binaryDataManager');
	await BinaryDataManager.init(binaryDataConfig);

	// Init db since we need to read the license.
	await Db.init();

	const license = getLicense();
	await license.init(instanceId, cli);

	// Start timeout for the execution
	let workflowTimeout = config.getEnv('executions.timeout'); // initialize with default
	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
	if (workflowRunnerData.workflowData.settings?.executionTimeout) {
		workflowTimeout = workflowRunnerData.workflowData.settings.executionTimeout as number; // preference on workflow setting
	}

	if (workflowTimeout > 0) {
		workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
	}

	workflowRunnerWorkflow = new Workflow({
		id: workflowRunnerData.workflowData.id,
		name: workflowRunnerData.workflowData.name,
		nodes: workflowRunnerData.workflowData.nodes,
		connections: workflowRunnerData.workflowData.connections,
		active: workflowRunnerData.workflowData.active,
		nodeTypes,
		staticData: workflowRunnerData.workflowData.staticData,
		settings: workflowRunnerData.workflowData.settings,
		pinData: workflowRunnerData.pinData,
	});
	try {
		await PermissionChecker.check(workflowRunnerWorkflow, userId);
	} catch (error) {
		const caughtError = error as NodeOperationError;
		const failedExecutionData = generateFailedExecutionFromError(
			workflowRunnerData.executionMode,
			caughtError,
			caughtError.node,
		);

		// Force the `workflowExecuteAfter` hook to run since
		// it's the one responsible for saving the execution
		hookToParent.next({ hook: 'workflowExecuteAfter', parameters: [failedExecutionData] });
		// Interrupt the workflow execution since we don't have all necessary creds.
		return failedExecutionData;
	}
	const additionalData = await WorkflowExecuteAdditionalData.getBase(
		userId,
		undefined,
		workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
	);
	additionalData.hooks = getProcessForwardHooks();

	additionalData.hooks.hookFunctions.sendResponse = [
		async (response: IExecuteResponsePromiseData): Promise<void> => {
			messageToParent.next({
				type: 'sendResponse',
				data: {
					response: WebhookHelpers.encodeWebhookResponse(response),
				},
			});
		},
	];

	additionalData.executionId = inputData.executionId;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	additionalData.sendMessageToUI = (source: string, message: any) => {
		if (workflowRunnerData!.executionMode !== 'manual') {
			return;
		}

		console.log({ source, message });
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			messageToUi.next({ source, message });
		} catch (error) {
			ErrorReporter.error(error);
			workflowRunnerLogger.error(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`There was a problem sending UI data to parent process: "${error.message}"`,
			);
		}
	};
	const executeWorkflowFunction = additionalData.executeWorkflow;
	additionalData.executeWorkflow = async (
		workflowInfo: IExecuteWorkflowInfo,
		additionalDataInner: IWorkflowExecuteAdditionalData,
		options?: {
			parentWorkflowId?: string;
			inputData?: INodeExecutionData[];
			parentWorkflowSettings?: IWorkflowSettings;
		},
	): Promise<Array<INodeExecutionData[] | null> | IRun> => {
		const workflowData = await WorkflowExecuteAdditionalData.getWorkflowData(
			workflowInfo,
			options?.parentWorkflowId,
			options?.parentWorkflowSettings,
		);
		const runData = await WorkflowExecuteAdditionalData.getRunData(
			workflowData,
			additionalDataInner.userId,
			options?.inputData,
			options?.parentWorkflowId,
		);
		messageToParent.next({ type: 'startExecution', data: { runData } });
		const executionId: string = await new Promise((resolve) => {
			workflowRunnerExecutionIdCallback = (executionIdInner: string) => {
				resolve(executionIdInner);
			};
		});

		void InternalHooksManager.getInstance().onWorkflowBeforeExecute(executionId || '', runData);

		let result: IRun;
		try {
			const executeWorkflowFunctionOutput = (await executeWorkflowFunction(
				workflowInfo,
				additionalDataInner,
				{
					parentWorkflowId: options?.parentWorkflowId,
					inputData: options?.inputData,
					parentExecutionId: executionId,
					loadedWorkflowData: workflowData,
					loadedRunData: runData,
					parentWorkflowSettings: options?.parentWorkflowSettings,
				},
			)) as { workflowExecute: WorkflowExecute; workflow: Workflow } as IWorkflowExecuteProcess;
			const { workflowExecute } = executeWorkflowFunctionOutput;
			workflowRunnerChildExecutions[executionId] = executeWorkflowFunctionOutput;
			const { workflow } = executeWorkflowFunctionOutput;
			result = await workflowExecute.processRunExecutionData(workflow);
			await externalHooks.run('workflow.postExecute', [result, workflowData, executionId]);
			void InternalHooksManager.getInstance().onWorkflowPostExecute(
				executionId,
				workflowData,
				result,
				additionalDataInner.userId,
			);
			messageToParent.next({ type: 'finishExecution', data: { executionId, result } });
			delete workflowRunnerChildExecutions[executionId];
		} catch (e) {
			messageToParent.next({ type: 'finishExecution', data: { executionId } });
			delete workflowRunnerChildExecutions[executionId];
			// Throw same error we had
			throw e;
		}

		messageToParent.next({ type: 'finishExecution', data: { executionId, result } });

		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(result);

		if (returnData!.error) {
			const error = new Error(returnData!.error.message);
			error.stack = returnData!.error.stack;
			throw error;
		}

		return returnData!.data!.main;
	};

	if (workflowRunnerData.executionData !== undefined) {
		workflowRunnerWorkflowExecute = new WorkflowExecute(
			additionalData,
			workflowRunnerData.executionMode,
			workflowRunnerData.executionData,
		);

		return workflowRunnerWorkflowExecute.processRunExecutionData(workflowRunnerWorkflow);
	}
	if (
		workflowRunnerData.runData === undefined ||
		workflowRunnerData.startNodes === undefined ||
		workflowRunnerData.startNodes.length === 0 ||
		workflowRunnerData.destinationNode === undefined
	) {
		// Execute all nodes

		let startNode;
		if (
			workflowRunnerData.startNodes?.length === 1 &&
			Object.keys(workflowRunnerData.pinData ?? {}).includes(workflowRunnerData.startNodes[0])
		) {
			startNode = workflowRunnerWorkflow.getNode(workflowRunnerData.startNodes[0]) ?? undefined;
		}

		// Can execute without webhook so go on
		workflowRunnerWorkflowExecute = new WorkflowExecute(
			additionalData,
			workflowRunnerData.executionMode,
		);
		return workflowRunnerWorkflowExecute.run(
			workflowRunnerWorkflow,
			startNode,
			workflowRunnerData.destinationNode,
			workflowRunnerData.pinData,
		);
	}
	// Execute only the nodes between start and destination nodes
	workflowRunnerWorkflowExecute = new WorkflowExecute(
		additionalData,
		workflowRunnerData.executionMode,
	);
	return workflowRunnerWorkflowExecute.runPartialWorkflow(
		workflowRunnerWorkflow,
		workflowRunnerData.runData,
		workflowRunnerData.startNodes,
		workflowRunnerData.destinationNode,
		workflowRunnerData.pinData,
	);
}

const workflowRunnerWorker = {
	getMessageObservable: () => Observable.from(messageToParent),
	getHookObservable: () => Observable.from(hookToParent),
	getMessageUiObservable: () => Observable.from(messageToUi),
	getProcessErrorObservable: () => Observable.from(processErrors),
	startWorkflow: async (data: IWorkflowExecutionDataProcessWithExecution) => {
		try {
			workflowRunnerStartedAt = new Date();
			messageToParent.next({ type: 'start', data: undefined });
			const runData = await runWorkflow(data);
			messageToParent.next({ type: 'end', data: runData });
			// Once the workflow got executed make sure the process gets killed again
			closeUpShop();
		} catch (error) {
			sendProcessError(error);
		}
	},
	stopExecution: async (stopType: 'stopExecution' | 'timeout' = 'stopExecution') => {
		try {
			// The workflow execution should be stopped
			let runData: IRun;

			if (workflowRunnerWorkflowExecute !== undefined) {
				const executionIds = Object.keys(workflowRunnerChildExecutions);

				// eslint-disable-next-line no-restricted-syntax
				for (const executionId of executionIds) {
					const childWorkflowExecute = workflowRunnerChildExecutions[executionId];
					runData = childWorkflowExecute.workflowExecute.getFullRunData(
						workflowRunnerChildExecutions[executionId].startedAt,
					);
					const timeOutError =
						stopType === 'timeout'
							? new WorkflowOperationError('Workflow execution timed out!')
							: new WorkflowOperationError('Workflow-Execution has been canceled!');

					// If there is any data send it to parent process, if execution timedout add the error
					// eslint-disable-next-line no-await-in-loop
					await childWorkflowExecute.workflowExecute.processSuccessExecution(
						workflowRunnerChildExecutions[executionId].startedAt,
						childWorkflowExecute.workflow,
						timeOutError,
					);
				}

				// Workflow started already executing
				runData = workflowRunnerWorkflowExecute.getFullRunData(workflowRunnerStartedAt);

				const timeOutError =
					stopType === 'timeout'
						? new WorkflowOperationError('Workflow execution timed out!')
						: new WorkflowOperationError('Workflow-Execution has been canceled!');

				// If there is any data send it to parent process, if execution timedout add the error
				await workflowRunnerWorkflowExecute.processSuccessExecution(
					workflowRunnerStartedAt,
					workflowRunnerWorkflow!,
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					mode: workflowRunnerData
						? workflowRunnerData.executionMode
						: ('own' as WorkflowExecuteMode),
					startedAt: workflowRunnerStartedAt,
					stoppedAt: new Date(),
				};

				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				hookToParent.next({ hook: 'workflowExecuteAfter', parameters: [runData] });
			}

			messageToParent.next({
				type: stopType === 'timeout' ? stopType : 'end',
				data: runData,
			});

			closeUpShop();
		} catch (error) {
			sendProcessError(error);
		}
	},
	executionId: (executionId: string) => {
		try {
			workflowRunnerExecutionIdCallback(executionId);
		} catch (error) {
			sendProcessError(error);
		}
	},
};

if (isWorkerRuntime()) {
	expose(workflowRunnerWorker);
}
export type WorkflowRunnerWorker = typeof workflowRunnerWorker;
