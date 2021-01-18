import {
	CredentialsHelper,
	Db,
	ExternalHooks,
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
	IPushDataExecutionFinished,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	Push,
	ResponseHelper,
	WebhookHelpers,
	WorkflowCredentials,
	WorkflowHelpers,
} from './';

import {
	UserSettings,
	WorkflowExecute,
} from 'n8n-core';

import {
	IDataObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowCredentials,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
} from 'n8n-workflow';

import * as config from '../config';

import { LessThanOrEqual } from "typeorm";

const ERROR_TRIGGER_TYPE = config.get('nodes.errorTriggerType') as string;


/**
 * Checks if there was an error and if errorWorkflow or a trigger is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow got started in
 * @param {string} [executionId] The id the execution got saved as
 */
function executeErrorWorkflow(workflowData: IWorkflowBase, fullRunData: IRun, mode: WorkflowExecuteMode, executionId?: string, retryOf?: string): void {
	// Check if there was an error and if so if an errorWorkflow or a trigger is set

	let pastExecutionUrl: string | undefined = undefined;
	if (executionId !== undefined) {
		pastExecutionUrl = `${WebhookHelpers.getWebhookBaseUrl()}execution/${executionId}`;
	}

	if (fullRunData.data.resultData.error !== undefined) {
		const workflowErrorData = {
			execution: {
				id: executionId,
				url: pastExecutionUrl,
				error: fullRunData.data.resultData.error,
				lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
				mode,
				retryOf,
			},
			workflow: {
				id: workflowData.id !== undefined ? workflowData.id.toString() as string : undefined,
				name: workflowData.name,
			},
		};

		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		if (workflowData.settings !== undefined && workflowData.settings.errorWorkflow && !(mode === 'error' && workflowData.id && workflowData.settings.errorWorkflow.toString() === workflowData.id.toString())) {
			// If a specific error workflow is set run only that one
			WorkflowHelpers.executeErrorWorkflow(workflowData.settings.errorWorkflow as string, workflowErrorData);
		} else if (mode !== 'error' && workflowData.id !== undefined && workflowData.nodes.some((node) => node.type === ERROR_TRIGGER_TYPE)) {
			// If the workflow contains
			WorkflowHelpers.executeErrorWorkflow(workflowData.id.toString(), workflowErrorData);
		}
	}
}

/**
 * Prunes Saved Execution which are older than configured.
 * Throttled to be executed just once in configured timeframe.
 *
 */
let throttling = false;
function pruneExecutionData(): void {
	if (!throttling) {
		throttling = true;
		const timeout = config.get('executions.pruneDataTimeout') as number; // in seconds
		const maxAge = config.get('executions.pruneDataMaxAge') as number; // in h
		const date = new Date(); // today
		date.setHours(date.getHours() - maxAge);

		// throttle just on success to allow for self healing on failure
		Db.collections.Execution!.delete({ stoppedAt: LessThanOrEqual(date.toISOString()) })
		.then(data =>
			setTimeout(() => {
				throttling = false;
			}, timeout * 1000)
		).catch(err => throttling = false);
	}
}


/**
 * Pushes the execution out to all connected clients
 *
 * @param {WorkflowExecuteMode} mode The mode in which the workflow got started in
 * @param {IRun} fullRunData The RunData of the finished execution
 * @param {string} executionIdActive The id of the finished execution
 * @param {string} [executionIdDb] The database id of finished execution
 */
export function pushExecutionFinished(mode: WorkflowExecuteMode, fullRunData: IRun, executionIdActive: string, executionIdDb?: string, retryOf?: string) {
	// Clone the object except the runData. That one is not supposed
	// to be send. Because that data got send piece by piece after
	// each node which finished executing
	const pushRunData = {
		...fullRunData,
		data: {
			...fullRunData.data,
			resultData: {
				...fullRunData.data.resultData,
				runData: {},
			},
		},
	};

	// Push data to editor-ui once workflow finished
	const sendData: IPushDataExecutionFinished = {
		executionIdActive,
		executionIdDb,
		data: pushRunData,
		retryOf,
	};

	const pushInstance = Push.getInstance();
	pushInstance.send('executionFinished', sendData);
}


/**
 * Returns hook functions to push data to Editor-UI
 *
 * @returns {IWorkflowExecuteHooks}
 */
function hookFunctionsPush(): IWorkflowExecuteHooks {
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				// Push data to session which started workflow before each
				// node which starts rendering
				if (this.sessionId === undefined) {
					return;
				}

				const pushInstance = Push.getInstance();
				pushInstance.send('nodeExecuteBefore', {
					executionId: this.executionId,
					nodeName,
				}, this.sessionId);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string, data: ITaskData): Promise<void> {
				// Push data to session which started workflow after each rendered node
				if (this.sessionId === undefined) {
					return;
				}

				const pushInstance = Push.getInstance();
				pushInstance.send('nodeExecuteAfter', {
					executionId: this.executionId,
					nodeName,
					data,
				}, this.sessionId);
			},
		],
		workflowExecuteBefore: [
			async function (this: WorkflowHooks): Promise<void> {
				// Push data to editor-ui once workflow finished
				const pushInstance = Push.getInstance();
				pushInstance.send('executionStarted', {
					executionId: this.executionId,
					mode: this.mode,
					startedAt: new Date(),
					retryOf: this.retryOf,
					workflowId: this.workflowData.id as string,
					workflowName: this.workflowData.name,
				});
			},
		],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, fullRunData: IRun, newStaticData: IDataObject): Promise<void> {
				pushExecutionFinished(this.mode, fullRunData, this.executionId, undefined, this.retryOf);
			},
		],
	};
}


export function hookFunctionsPreExecute(parentProcessMode?: string): IWorkflowExecuteHooks {
	const externalHooks = ExternalHooks();

	return {
		workflowExecuteBefore: [
			async function (this: WorkflowHooks, workflow: Workflow): Promise<void> {
				await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
			},
		],
		nodeExecuteAfter: [
			async function (nodeName: string, data: ITaskData, executionData: IRunExecutionData): Promise<void> {
				if (this.workflowData.settings !== undefined) {
					if (this.workflowData.settings.saveExecutionProgress === false) {
						return;
					} else if (this.workflowData.settings.saveExecutionProgress !== true && !config.get('executions.saveExecutionProgress') as boolean) {
						return;
					}
				} else if (!config.get('executions.saveExecutionProgress') as boolean) {
					return;
				}

				const execution = await Db.collections.Execution!.findOne(this.executionId);

				if (execution === undefined) {
					// Something went badly wrong if this happens.
					// This check is here mostly to make typescript happy.
					return undefined; 
				}
				const fullExecutionData: IExecutionResponse = ResponseHelper.unflattenExecutionData(execution);

				if (fullExecutionData.finished) {
					// We already received ´workflowExecuteAfter´ webhook, so this is just an async call
					// that was left behind. We skip saving because the other call should have saved everything
					// so this one is safe to ignore
					return;
				}


				if (fullExecutionData.data === undefined) {
					fullExecutionData.data = {
						startData: {
						},
						resultData: {
							runData: {},
						},
						executionData: {
							contextData: {},
							nodeExecutionStack: [],
							waitingExecution: {},
						},
					};
				}

				if (Array.isArray(fullExecutionData.data.resultData.runData[nodeName])) {
					// Append data if array exists
					fullExecutionData.data.resultData.runData[nodeName].push(data);
				} else {
					// Initialize array and save data
					fullExecutionData.data.resultData.runData[nodeName] = [data];
				}

				fullExecutionData.data.executionData = executionData.executionData;

				// Set last executed node so that it may resume on failure
				fullExecutionData.data.resultData.lastNodeExecuted = nodeName;
				
				const flattenedExecutionData = ResponseHelper.flattenExecutionData(fullExecutionData);

				await Db.collections.Execution!.update(this.executionId, flattenedExecutionData as IExecutionFlattedDb);
			},
		],
	};
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 *
 * @returns {IWorkflowExecuteHooks}
 */
function hookFunctionsSave(parentProcessMode?: string): IWorkflowExecuteHooks {
	return {
		nodeExecuteBefore: [],
		nodeExecuteAfter: [],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, fullRunData: IRun, newStaticData: IDataObject): Promise<void> {

				// Prune old execution data
				if (config.get('executions.pruneData')) {
					pruneExecutionData();
				}

				const isManualMode = [this.mode, parentProcessMode].includes('manual');

				try {
					if (!isManualMode && WorkflowHelpers.isWorkflowIdValid(this.workflowData.id as string) === true && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowHelpers.saveStaticDataById(this.workflowData.id as string, newStaticData);
						} catch (e) {
							// TODO: Add proper logging!
							console.error(`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: ${e.message}`);
						}
					}

					let saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
					if (this.workflowData.settings !== undefined && this.workflowData.settings.saveManualExecutions !== undefined) {
						// Apply to workflow override
						saveManualExecutions = this.workflowData.settings.saveManualExecutions as boolean;
					}

					if (isManualMode && saveManualExecutions === false) {
						// Data is always saved, so we remove from database
						Db.collections.Execution!.delete(this.executionId);
						return;
					}

					// Check config to know if execution should be saved or not
					let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
					let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
					if (this.workflowData.settings !== undefined) {
						saveDataErrorExecution = (this.workflowData.settings.saveDataErrorExecution as string) || saveDataErrorExecution;
						saveDataSuccessExecution = (this.workflowData.settings.saveDataSuccessExecution as string) || saveDataSuccessExecution;
					}

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
						workflowDidSucceed === false && saveDataErrorExecution === 'none'
					) {
						if (!isManualMode) {
							executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
						}
						// Data is always saved, so we remove from database
						Db.collections.Execution!.delete(this.executionId);
						return;
					}

					const fullExecutionData: IExecutionDb = {
						data: fullRunData.data,
						mode: fullRunData.mode,
						finished: fullRunData.finished ? fullRunData.finished : false,
						startedAt: fullRunData.startedAt,
						stoppedAt: fullRunData.stoppedAt,
						workflowData: this.workflowData,
					};

					if (this.retryOf !== undefined) {
						fullExecutionData.retryOf = this.retryOf.toString();
					}

					if (this.workflowData.id !== undefined && WorkflowHelpers.isWorkflowIdValid(this.workflowData.id.toString()) === true) {
						fullExecutionData.workflowId = this.workflowData.id.toString();
					}

					const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					// Save the Execution in DB
					await Db.collections.Execution!.update(this.executionId, executionData as IExecutionFlattedDb);

					if (fullRunData.finished === true && this.retryOf !== undefined) {
						// If the retry was successful save the reference it on the original execution
						// await Db.collections.Execution!.save(executionData as IExecutionFlattedDb);
						await Db.collections.Execution!.update(this.retryOf, { retrySuccessId: this.executionId });
					}

					if (!isManualMode) {
						executeErrorWorkflow(this.workflowData, fullRunData, this.mode, this.executionId, this.retryOf);
					}
				} catch (error) {
					if (!isManualMode) {
						executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
					}
				}
			},
		],
	};
}


/**
 * Executes the workflow with the given ID
 *
 * @export
 * @param {string} workflowId The id of the workflow to execute
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {INodeExecutionData[]} [inputData]
 * @returns {(Promise<Array<INodeExecutionData[] | null>>)}
 */
export async function executeWorkflow(workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, inputData?: INodeExecutionData[]): Promise<Array<INodeExecutionData[] | null>> {
	const mode = 'integrated';

	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new Error(`No information about the workflow to execute found. Please provide either the "id" or "code"!`);
	}

	if (Db.collections!.Workflow === null) {
		// The first time executeWorkflow gets called the Database has
		// to get initialized first
		await Db.init();
	}

	let workflowData: IWorkflowBase | undefined;
	if (workflowInfo.id !== undefined) {
		workflowData = await Db.collections!.Workflow!.findOne(workflowInfo.id);
		if (workflowData === undefined) {
			throw new Error(`The workflow with the id "${workflowInfo.id}" does not exist.`);
		}
	} else {
		workflowData = workflowInfo.code;
	}

	const externalHooks = ExternalHooks();
	await externalHooks.init();

	const nodeTypes = NodeTypes();

	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new Workflow({ id: workflowInfo.id, name: workflowName, nodes: workflowData!.nodes, connections: workflowData!.connections, active: workflowData!.active, nodeTypes, staticData: workflowData!.staticData });

	// Does not get used so set it simply to empty string
	const executionId = '';

	// Get the needed credentials for the current workflow as they will differ to the ones of the
	// calling workflow.
	const credentials = await WorkflowCredentials(workflowData!.nodes);

	// Create new additionalData to have different workflow loaded and to call
	// different webooks
	const additionalDataIntegrated = await getBase(credentials);
	additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(mode, executionId, workflowData!, { parentProcessMode: additionalData.hooks!.mode });

	// Find Start-Node
	const requiredNodeTypes = ['n8n-nodes-base.start'];
	let startNode: INode | undefined;
	for (const node of workflowData!.nodes) {
		if (requiredNodeTypes.includes(node.type)) {
			startNode = node;
			break;
		}
	}
	if (startNode === undefined) {
		// If the workflow does not contain a start-node we can not know what
		// should be executed and with what data to start.
		throw new Error(`The workflow does not contain a "Start" node and can so not be executed.`);
	}

	// Always start with empty data if no inputData got supplied
	inputData = inputData || [
		{
			json: {},
		},
	];

	// Initialize the incoming data
	const nodeExecutionStack: IExecuteData[] = [];
	nodeExecutionStack.push(
		{
			node: startNode,
			data: {
				main: [inputData],
			},
		}
	);

	const runExecutionData: IRunExecutionData = {
		startData: {
		},
		resultData: {
			runData: {},
		},
		executionData: {
			contextData: {},
			nodeExecutionStack,
			waitingExecution: {},
		},
	};

	// Execute the workflow
	const workflowExecute = new WorkflowExecute(additionalDataIntegrated, mode, runExecutionData);
	const data = await workflowExecute.processRunExecutionData(workflow);

	await externalHooks.run('workflow.postExecute', [data, workflowData]);

	if (data.finished === true) {
		// Workflow did finish successfully
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return returnData!.data!.main;
	} else {
		// Workflow did fail
		const error = new Error(data.data.resultData.error!.message);
		error.stack = data.data.resultData.error!.stack;
		throw error;
	}
}


/**
 * Returns the base additional data without webhooks
 *
 * @export
 * @param {IWorkflowCredentials} credentials
 * @param {INodeParameters} currentNodeParameters
 * @returns {Promise<IWorkflowExecuteAdditionalData>}
 */
export async function getBase(credentials: IWorkflowCredentials, currentNodeParameters?: INodeParameters): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

	const timezone = config.get('generic.timezone') as string;
	const webhookBaseUrl = urlBaseWebhook + config.get('endpoints.webhook') as string;
	const webhookTestBaseUrl = urlBaseWebhook + config.get('endpoints.webhookTest') as string;

	const encryptionKey = await UserSettings.getEncryptionKey();
	if (encryptionKey === undefined) {
		throw new Error('No encryption key got found to decrypt the credentials!');
	}

	return {
		credentials,
		credentialsHelper: new CredentialsHelper(credentials, encryptionKey),
		encryptionKey,
		executeWorkflow,
		restApiUrl: urlBaseWebhook + config.get('endpoints.rest') as string,
		timezone,
		webhookBaseUrl,
		webhookTestBaseUrl,
		currentNodeParameters,
	};
}


/**
 * Returns WorkflowHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getWorkflowHooksIntegrated(mode: WorkflowExecuteMode, executionId: string, workflowData: IWorkflowBase, optionalParameters?: IWorkflowHooksOptionalParameters): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsSave(optionalParameters.parentProcessMode);
	const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
	for (const key of Object.keys(preExecuteFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}


/**
 * Returns WorkflowHooks instance for main process if workflow runs via worker
 */
export function getWorkflowHooksWorkerMain(mode: WorkflowExecuteMode, executionId: string, workflowData: IWorkflowBase, optionalParameters?: IWorkflowHooksOptionalParameters): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsPush();
	const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
	for (const key of Object.keys(preExecuteFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hookFunctions.nodeExecuteBefore = [];
	hookFunctions.nodeExecuteAfter = [];
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}


/**
 * Returns WorkflowHooks instance for running the main workflow
 *
 * @export
 * @param {IWorkflowExecutionDataProcess} data
 * @param {string} executionId
 * @returns {WorkflowHooks}
 */
export function getWorkflowHooksMain(data: IWorkflowExecutionDataProcess, executionId: string, isMainProcess = false): WorkflowHooks {
	const hookFunctions = hookFunctionsSave();
	const pushFunctions = hookFunctionsPush();
	for (const key of Object.keys(pushFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], pushFunctions[key]);
	}

	if (isMainProcess) {
		const preExecuteFunctions = hookFunctionsPreExecute();
		for (const key of Object.keys(preExecuteFunctions)) {
			if (hookFunctions[key] === undefined) {
				hookFunctions[key] = [];
			}
			hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
		}
	}

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, { sessionId: data.sessionId, retryOf: data.retryOf as string});
}

