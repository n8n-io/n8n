import {
	Db,
	IExecutionDb,
	IExecutionFlattedDb,
	IPushDataExecutionFinished,
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

import * as config from 'config';

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


const hooks = (mode: WorkflowExecuteMode, workflowData: IWorkflowBase, workflowInstance: Workflow, sessionId?: string, retryOf?: string) => {
	return {
		nodeExecuteBefore: [
			async (executionId: string, nodeName: string): Promise<void> => {
				if (sessionId === undefined) {
					return;
				}

				const sendData: IPushDataNodeExecuteBefore = {
					executionId,
					nodeName,
				};

				pushInstance.send(sessionId, 'nodeExecuteBefore', sendData);
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

				pushInstance.send(sessionId, 'nodeExecuteAfter', sendData);
			},
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun, executionId: string): Promise<void> => {
				try {
					if (sessionId !== undefined) {
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
							executionId,
							data: pushRunData,
						};

						pushInstance.send(sessionId, 'executionFinished', sendData);
					}

					const workflowSavePromise = WorkflowHelpers.saveStaticData(workflowInstance);

					let saveManualRuns = config.get('executions.saveManualRuns') as boolean;
					if (workflowInstance.settings !== undefined && workflowInstance.settings.saveManualRuns !== undefined) {
						// Apply to workflow override
						saveManualRuns = workflowInstance.settings.saveManualRuns as boolean;
					}

					if (mode === 'manual' && saveManualRuns === false) {
						if (workflowSavePromise !== undefined) {
							// If workflow had to be saved wait till it is done
							await workflowSavePromise;
						}

						// For now do not save manual executions
						// TODO: Later that should be configurable. Think about what to do
						//       with the workflow.id when not saved yet or currently differes from saved version (save diff?!?!)

						executeErrorWorkflow(workflowData, fullRunData, mode);
						return;
					}

					// TODO: Should maybe have different log-modes like
					//       to save all data, only first input, only last node output, ....
					//       or depending on success to only save all on error to be
					//       able to start it again where it ended (but would then also have to save active data)
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

					executeErrorWorkflow(workflowData, fullRunData, mode, executionResult ? executionResult.id as string : undefined);
				} catch (error) {
					executeErrorWorkflow(workflowData, fullRunData, mode);
				}
			},
		]
	};
};


export async function get(mode: WorkflowExecuteMode, workflowData: IWorkflowBase, workflowInstance: Workflow, sessionId?: string, retryOf?: string): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

	const timezone = config.get('timezone') as string;
	const webhookBaseUrl = urlBaseWebhook + config.get('urls.endpointWebhook') as string;
	const webhookTestBaseUrl = urlBaseWebhook + config.get('urls.endpointWebhookTest') as string;

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
