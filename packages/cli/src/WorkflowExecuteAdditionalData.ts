import {
	ActiveExecutions,
	CredentialsHelper,
	Db,
	ExternalHooks,
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
	IPushDataExecutionFinished,
	IWorkflowBase,
	IWorkflowExecuteProcess,
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
	LoggerProxy as Logger,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
} from 'n8n-workflow';

import * as config from '../config';

import { LessThanOrEqual } from 'typeorm';

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
			Logger.verbose(`Start external error workflow`, { executionId, errorWorkflowId: workflowData.settings.errorWorkflow.toString(), workflowId: workflowData.id });
			// If a specific error workflow is set run only that one
			WorkflowHelpers.executeErrorWorkflow(workflowData.settings.errorWorkflow as string, workflowErrorData);
		} else if (mode !== 'error' && workflowData.id !== undefined && workflowData.nodes.some((node) => node.type === ERROR_TRIGGER_TYPE)) {
			Logger.verbose(`Start internal error workflow`, { executionId, workflowId: workflowData.id });
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
		Logger.verbose('Pruning execution data from database');

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
				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });

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
				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });

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
				Logger.debug(`Executing hook (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
				// Push data to session which started the workflow
				if (this.sessionId === undefined) {
					return;
				}
				const pushInstance = Push.getInstance();
				pushInstance.send('executionStarted', {
					executionId: this.executionId,
					mode: this.mode,
					startedAt: new Date(),
					retryOf: this.retryOf,
					workflowId: this.workflowData.id, sessionId: this.sessionId as string,
					workflowName: this.workflowData.name,
				}, this.sessionId);
			},
		],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, fullRunData: IRun, newStaticData: IDataObject): Promise<void> {
				Logger.debug(`Executing hook (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
				// Push data to session which started the workflow
				if (this.sessionId === undefined) {
					return;
				}

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
				Logger.debug(`Save execution progress to database for execution ID ${this.executionId} `, { executionId: this.executionId, workflowId: this.workflowData.id });
				// TODO: Look at this again
				const sendData: IPushDataExecutionFinished = {
					executionId: this.executionId,
					data: pushRunData,
					retryOf: this.retryOf,
				};

				const pushInstance = Push.getInstance();
				pushInstance.send('executionFinished', sendData, this.sessionId);
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

				try {
					Logger.debug(`Save execution progress to database for execution ID ${this.executionId} `, { executionId: this.executionId, nodeName });

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
				} catch (err) {
					// TODO: Improve in the future!
					// Errors here might happen because of database access
					// For busy machines, we may get "Database is locked" errors.

					// We do this to prevent crashes and executions ending in `unknown` state.
					Logger.error(`Failed saving execution progress to database for execution ID ${this.executionId} (hookFunctionsPreExecute, nodeExecuteAfter)`, { ...err, executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
				}

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
				Logger.debug(`Executing hook (hookFunctionsSave)`, { executionId: this.executionId, workflowId: this.workflowData.id });

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
							Logger.error(`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`, { executionId: this.executionId, workflowId: this.workflowData.id });
						}
					}

					let saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
					if (this.workflowData.settings !== undefined && this.workflowData.settings.saveManualExecutions !== undefined) {
						// Apply to workflow override
						saveManualExecutions = this.workflowData.settings.saveManualExecutions as boolean;
					}

					if (isManualMode && saveManualExecutions === false) {
						// Data is always saved, so we remove from database
						await Db.collections.Execution!.delete(this.executionId);
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
						await Db.collections.Execution!.delete(this.executionId);
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

					// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
					Logger.debug(`Save execution data to database for execution ID ${this.executionId}`, { executionId: this.executionId, workflowId: this.workflowData.id });

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
 * Returns hook functions to save workflow execution and call error workflow
 * for running with queues. Manual executions should never run on queues as
 * they are always executed in the main process.
 *
 * @returns {IWorkflowExecuteHooks}
 */
function hookFunctionsSaveWorker(): IWorkflowExecuteHooks {
	return {
		nodeExecuteBefore: [],
		nodeExecuteAfter: [],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, fullRunData: IRun, newStaticData: IDataObject): Promise<void> {
				try {
					if (WorkflowHelpers.isWorkflowIdValid(this.workflowData.id as string) === true && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowHelpers.saveStaticDataById(this.workflowData.id as string, newStaticData);
						} catch (e) {
							Logger.error(`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`, { sessionId: this.sessionId, workflowId: this.workflowData.id });
						}
					}

					// Check config to know if execution should be saved or not
					let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
					if (this.workflowData.settings !== undefined) {
						saveDataErrorExecution = (this.workflowData.settings.saveDataErrorExecution as string) || saveDataErrorExecution;
					}

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (workflowDidSucceed === false && saveDataErrorExecution === 'none') {
						executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
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
				} catch (error) {
					executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
				}
			},
		],
	};
}

export async function getRunData(workflowData: IWorkflowBase, inputData?: INodeExecutionData[]): Promise<IWorkflowExecutionDataProcess> {
	const mode = 'integrated';

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

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: mode,
		executionData: runExecutionData,
		// @ts-ignore
		workflowData,
	};

	return runData;
}


export async function getWorkflowData(workflowInfo: IExecuteWorkflowInfo): Promise<IWorkflowBase> {
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

	return workflowData!;
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
export async function executeWorkflow(workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, inputData?: INodeExecutionData[], parentExecutionId?: string, loadedWorkflowData?: IWorkflowBase, loadedRunData?: IWorkflowExecutionDataProcess): Promise<Array<INodeExecutionData[] | null> | IWorkflowExecuteProcess> {
	const externalHooks = ExternalHooks();
	await externalHooks.init();

	const nodeTypes = NodeTypes();

	const workflowData = loadedWorkflowData !== undefined ? loadedWorkflowData : await getWorkflowData(workflowInfo);

	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new Workflow({ id: workflowInfo.id, name: workflowName, nodes: workflowData!.nodes, connections: workflowData!.connections, active: workflowData!.active, nodeTypes, staticData: workflowData!.staticData });

	const runData = loadedRunData !== undefined ? loadedRunData : await getRunData(workflowData, inputData);

	let executionId;

	if (parentExecutionId !== undefined) {
		executionId = parentExecutionId;
	} else {
		executionId = parentExecutionId !== undefined ? parentExecutionId : await ActiveExecutions.getInstance().add(runData);
	}

	const runExecutionData = runData.executionData as IRunExecutionData;

	// Create new additionalData to have different workflow loaded and to call
	// different webooks
	const additionalDataIntegrated = await getBase();
	additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(runData.executionMode, executionId, workflowData!, { parentProcessMode: additionalData.hooks!.mode });
	// Make sure we pass on the original executeWorkflow function we received
	// This one already contains changes to talk to parent process
	// and get executionID from `activeExecutions` running on main process
	additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;

	let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
	if (workflowData.settings?.executionTimeout !== undefined && workflowData.settings.executionTimeout > 0) {
		// We might have received a max timeout timestamp from the parent workflow
		// If we did, then we get the minimum time between the two timeouts
		// If no timeout was given from the parent, then we use our timeout.
		subworkflowTimeout = Math.min(additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER, Date.now() + (workflowData.settings.executionTimeout as number * 1000));
	}
	
	additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;


	// Execute the workflow
	const workflowExecute = new WorkflowExecute(additionalDataIntegrated, runData.executionMode, runExecutionData);
	if (parentExecutionId !== undefined) {
		// Must be changed to become typed
		return {
			startedAt: new Date(),
			workflow,
			workflowExecute,
		};
	}
	const data = await workflowExecute.processRunExecutionData(workflow);

	await externalHooks.run('workflow.postExecute', [data, workflowData]);

	if (data.finished === true) {
		// Workflow did finish successfully

		await ActiveExecutions.getInstance().remove(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return returnData!.data!.main;
	} else {
		await ActiveExecutions.getInstance().remove(executionId, data);
		// Workflow did fail
		const { error } = data.data.resultData;
		throw {
			...error,
			stack: error!.stack,
		};
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
export async function getBase(currentNodeParameters?: INodeParameters, executionTimeoutTimestamp?: number): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

	const timezone = config.get('generic.timezone') as string;
	const webhookBaseUrl = urlBaseWebhook + config.get('endpoints.webhook') as string;
	const webhookTestBaseUrl = urlBaseWebhook + config.get('endpoints.webhookTest') as string;

	const encryptionKey = await UserSettings.getEncryptionKey();
	if (encryptionKey === undefined) {
		throw new Error('No encryption key got found to decrypt the credentials!');
	}

	return {
		credentialsHelper: new CredentialsHelper(encryptionKey),
		encryptionKey,
		executeWorkflow,
		restApiUrl: urlBaseWebhook + config.get('endpoints.rest') as string,
		timezone,
		webhookBaseUrl,
		webhookTestBaseUrl,
		currentNodeParameters,
		executionTimeoutTimestamp,
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
 * Returns WorkflowHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getWorkflowHooksWorkerExecuter(mode: WorkflowExecuteMode, executionId: string, workflowData: IWorkflowBase, optionalParameters?: IWorkflowHooksOptionalParameters): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsSaveWorker();
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

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, { sessionId: data.sessionId, retryOf: data.retryOf as string });
}

