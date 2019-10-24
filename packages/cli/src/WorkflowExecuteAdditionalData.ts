import {
	Db,
	IExecutionDb,
	IExecutionFlattedDb,
	IPushDataExecutionFinished,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	Push,
	ResponseHelper,
	WebhookHelpers,
	WorkflowHelpers,
} from './';

import {
	UserSettings,
} from 'n8n-core';

import {
	IDataObject,
	INodeParameters,
	IRun,
	ITaskData,
	IWorkflowCredentials,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as config from '../config';


/**
 * Checks if there was an error and if errorWorkflow is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow which did error got started in
 * @param {string} [executionId] The id the execution got saved as
 */
function executeErrorWorkflow(workflowData: IWorkflowBase, fullRunData: IRun, mode: WorkflowExecuteMode, executionId?: string, retryOf?: string): void {
	if (mode === 'manual') {
		// Do not call error workflow when executed manually
		return;
	}

	// Check if there was an error and if so if an errorWorkflow is set
	if (fullRunData.data.resultData.error !== undefined && workflowData.settings !== undefined && workflowData.settings.errorWorkflow) {
		const workflowErrorData = {
			execution: {
				id: executionId,
				error: fullRunData.data.resultData.error,
				lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
				mode,
				retryOf,
			},
			workflow: {
				id: workflowData.id !== undefined ? workflowData.id.toString() as string : undefined,
				name: workflowData.name,
			}
		};
		// Run the error workflow
		WorkflowHelpers.executeErrorWorkflow(workflowData.settings.errorWorkflow as string, workflowErrorData);
	}
}


/**
 * Pushes the execution out to all connected clients
 *
 * @param {IRun} fullRunData The RunData of the finished execution
 * @param {string} executionIdActive The id of the finished execution
 * @param {string} [executionIdDb] The database id of finished execution
 */
export function pushExecutionFinished(fullRunData: IRun, executionIdActive: string, executionIdDb?: string, retryOf?: string) {
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
 * Returns the workflow execution hooks
 *
 * @param {WorkflowExecuteMode} mode
 * @param {IWorkflowBase} workflowData
 * @param {string} executionId
 * @param {string} [sessionId]
 * @param {string} [retryOf]
 * @returns {IWorkflowExecuteHooks}
 */
const hooks = (mode: WorkflowExecuteMode, workflowData: IWorkflowBase, executionId: string, sessionId?: string, retryOf?: string): IWorkflowExecuteHooks => {
	return {
		nodeExecuteBefore: [
			async (nodeName: string): Promise<void> => {
				// Push data to session which started workflow before each
				// node which starts rendering
				if (sessionId === undefined) {
					return;
				}

				const pushInstance = Push.getInstance();
				pushInstance.send('nodeExecuteBefore', {
					executionId,
					nodeName,
				}, sessionId);
			},
		],
		nodeExecuteAfter: [
			async (nodeName: string, data: ITaskData): Promise<void> => {
				// Push data to session which started workflow after each rendered node
				if (sessionId === undefined) {
					return;
				}

				const pushInstance = Push.getInstance();
				pushInstance.send('nodeExecuteAfter', {
					executionId,
					nodeName,
					data,
				}, sessionId);
			},
		],
		workflowExecuteBefore: [
			async (): Promise<void> => {
				// Push data to editor-ui once workflow finished
				const pushInstance = Push.getInstance();
				pushInstance.send('executionStarted', {
					executionId,
					mode,
					startedAt: new Date(),
					retryOf,
					workflowId: workflowData.id as string,
					workflowName: workflowData.name,
				});
			}
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun, newStaticData: IDataObject): Promise<void> => {
				try {
					if (mode !== 'manual' && WorkflowHelpers.isWorkflowIdValid(workflowData.id as string) === true && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowHelpers.saveStaticDataById(workflowData.id as string, newStaticData);
						} catch (e) {
							// TODO: Add proper logging!
							console.error(`There was a problem saving the workflow with id "${workflowData.id}" to save changed staticData: ${e.message}`);
						}
					}

					let saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
					if (workflowData.settings !== undefined && workflowData.settings.saveManualExecutions !== undefined) {
						// Apply to workflow override
						saveManualExecutions = workflowData.settings.saveManualExecutions as boolean;
					}

					if (mode === 'manual' && saveManualExecutions === false) {
						pushExecutionFinished(fullRunData, executionId, undefined, retryOf);
						executeErrorWorkflow(workflowData, fullRunData, mode, undefined, retryOf);
						return;
					}

					// Check config to know if execution should be saved or not
					let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
					let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
					if (workflowData.settings !== undefined) {
						saveDataErrorExecution = (workflowData.settings.saveDataErrorExecution as string) || saveDataErrorExecution;
						saveDataSuccessExecution = (workflowData.settings.saveDataSuccessExecution as string) || saveDataSuccessExecution;
					}

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
						workflowDidSucceed === false && saveDataErrorExecution === 'none'
					) {
						pushExecutionFinished(fullRunData, executionId, undefined, retryOf);
						executeErrorWorkflow(workflowData, fullRunData, mode, undefined, retryOf);
						return;
					}

					const fullExecutionData: IExecutionDb = {
						data: fullRunData.data,
						mode: fullRunData.mode,
						finished: fullRunData.finished ? fullRunData.finished : false,
						startedAt: fullRunData.startedAt,
						stoppedAt: fullRunData.stoppedAt,
						workflowData,
					};

					if (retryOf !== undefined) {
						fullExecutionData.retryOf = retryOf.toString();
					}

					if (workflowData.id !== undefined && WorkflowHelpers.isWorkflowIdValid(workflowData.id.toString()) === true) {
						fullExecutionData.workflowId = workflowData.id.toString();
					}

					const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					// Save the Execution in DB
					const executionResult = await Db.collections.Execution!.save(executionData as IExecutionFlattedDb);

					if (fullRunData.finished === true && retryOf !== undefined) {
						// If the retry was successful save the reference it on the original execution
						// await Db.collections.Execution!.save(executionData as IExecutionFlattedDb);
						await Db.collections.Execution!.update(retryOf, { retrySuccessId: executionResult.id });
					}

					pushExecutionFinished(fullRunData, executionId, executionResult.id as string, retryOf);
					executeErrorWorkflow(workflowData, fullRunData, mode, executionResult ? executionResult.id as string : undefined, retryOf);
				} catch (error) {
					pushExecutionFinished(fullRunData, executionId, undefined, retryOf);
					executeErrorWorkflow(workflowData, fullRunData, mode, undefined, retryOf);
				}
			},
		]
	};
};


/**
 * Returns the base additional data without webhooks
 *
 * @export
 * @param {WorkflowExecuteMode} mode
 * @param {IWorkflowCredentials} credentials
 * @returns {Promise<IWorkflowExecuteAdditionalData>}
 */
export async function getBase(mode: WorkflowExecuteMode, credentials: IWorkflowCredentials, currentNodeParameters: INodeParameters[] = []): Promise<IWorkflowExecuteAdditionalData> {
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
		encryptionKey,
		timezone,
		webhookBaseUrl,
		webhookTestBaseUrl,
		currentNodeParameters,
	};
}


/**
 * Returns the workflow hooks
 *
 * @export
 * @param {IWorkflowExecutionDataProcess} data
 * @param {string} executionId
 * @returns {IWorkflowExecuteHooks}
 */
export function getHookMethods(data: IWorkflowExecutionDataProcess, executionId: string): IWorkflowExecuteHooks {
	return hooks(data.executionMode, data.workflowData, executionId, data.sessionId, data.retryOf as string | undefined);
}
