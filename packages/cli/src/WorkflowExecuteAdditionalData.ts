import {
	Db,
	IExecutionDb,
	IExecutionFlattedDb,
	IPushDataExecutionFinished,
	IPushDataExecutionStarted,
	IPushDataNodeExecuteAfter,
	IPushDataNodeExecuteBefore,
	IWorkflowBase,
	Push,
	ResponseHelper,
	WebhookHelpers,
	WorkflowCredentials,
	WorkflowHelpers,
} from './';

import {
	UserSettings,
} from "n8n-core";

import {
	IRun,
	ITaskData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	Workflow,
} from 'n8n-workflow';

import * as config from '../config';

const pushInstance = Push.getInstance();


/**
 * Checks if there was an error and if errorWorkflow is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow which did error got started in
 * @param {string} [executionId] The id the execution got saved as
 */
function executeErrorWorkflow(workflowData: IWorkflowBase, fullRunData: IRun, mode: WorkflowExecuteMode, executionId?: string): void {
	// Check if there was an error and if so if an errorWorkflow is set
	if (fullRunData.data.resultData.error !== undefined && workflowData.settings !== undefined && workflowData.settings.errorWorkflow) {
		const workflowErrorData = {
			execution: {
				id: executionId,
				error: fullRunData.data.resultData.error,
				lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
				mode,
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
function pushExecutionFinished(fullRunData: IRun, executionIdActive: string, executionIdDb?: string) {
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
	};

	pushInstance.send('executionFinished', sendData);
}


const hooks = (mode: WorkflowExecuteMode, workflowData: IWorkflowBase, workflowInstance: Workflow, sessionId?: string, retryOf?: string) => {
	return {
		nodeExecuteBefore: [
			async (executionId: string, nodeName: string): Promise<void> => {
				if (sessionId === undefined) {
					// Only push data to the session which started it
					return;
				}

				const sendData: IPushDataNodeExecuteBefore = {
					executionId,
					nodeName,
				};

				pushInstance.send('nodeExecuteBefore', sendData, sessionId);
			},
		],
		nodeExecuteAfter: [
			async (executionId: string, nodeName: string, data: ITaskData): Promise<void> => {
				if (sessionId === undefined) {
					return;
				}

				const sendData: IPushDataNodeExecuteAfter = {
					executionId,
					nodeName,
					data,
				};

				pushInstance.send('nodeExecuteAfter', sendData, sessionId);
			},
		],
		workflowExecuteBefore: [
			async (executionId: string): Promise<void> => {
				// Push data to editor-ui once workflow finished
				const sendData: IPushDataExecutionStarted = {
					executionId,
					mode,
					startedAt: new Date(),
					retryOf,
					workflowId: workflowData.id as string,
					workflowName: workflowData.name,
				};

				pushInstance.send('executionStarted', sendData);
			}
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun, executionId: string): Promise<void> => {
				try {
					const workflowSavePromise = WorkflowHelpers.saveStaticData(workflowInstance);

					let saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
					if (workflowInstance.settings !== undefined && workflowInstance.settings.saveManualExecutions !== undefined) {
						// Apply to workflow override
						saveManualExecutions = workflowInstance.settings.saveManualExecutions as boolean;
					}

					if (mode === 'manual' && saveManualExecutions === false) {
						if (workflowSavePromise !== undefined) {
							// If workflow had to be saved wait till it is done
							await workflowSavePromise;
						}

						pushExecutionFinished(fullRunData, executionId);
						executeErrorWorkflow(workflowData, fullRunData, mode);
						return;
					}

					// Check config to know if execution should be saved or not
					let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
					let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
					if (workflowInstance.settings !== undefined) {
						saveDataErrorExecution = (workflowInstance.settings.saveDataErrorExecution as string) || saveDataErrorExecution;
						saveDataSuccessExecution = (workflowInstance.settings.saveDataSuccessExecution as string) || saveDataSuccessExecution;
					}

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
						workflowDidSucceed === false && saveDataErrorExecution === 'none'
					) {
						pushExecutionFinished(fullRunData, executionId);
						executeErrorWorkflow(workflowData, fullRunData, mode);
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

					if (workflowSavePromise !== undefined) {
						// If workflow had to be saved wait till it is done
						await workflowSavePromise;
					}

					pushExecutionFinished(fullRunData, executionId, executionResult.id as string);
					executeErrorWorkflow(workflowData, fullRunData, mode, executionResult ? executionResult.id as string : undefined);
				} catch (error) {
					pushExecutionFinished(fullRunData, executionId);
					executeErrorWorkflow(workflowData, fullRunData, mode);
				}
			},
		]
	};
};


export async function get(mode: WorkflowExecuteMode, workflowData: IWorkflowBase, workflowInstance: Workflow, sessionId?: string, retryOf?: string): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

	const timezone = config.get('generic.timezone') as string;
	const webhookBaseUrl = urlBaseWebhook + config.get('endpoints.webhook') as string;
	const webhookTestBaseUrl = urlBaseWebhook + config.get('endpoints.webhookTest') as string;

	const encryptionKey = await UserSettings.getEncryptionKey();
	if (encryptionKey === undefined) {
		throw new Error('No encryption key got found to decrypt the credentials!');
	}

	return {
		credentials: await WorkflowCredentials(workflowData.nodes),
		hooks: hooks(mode, workflowData, workflowInstance, sessionId, retryOf),
		encryptionKey,
		timezone,
		webhookBaseUrl,
		webhookTestBaseUrl,
	};
}
