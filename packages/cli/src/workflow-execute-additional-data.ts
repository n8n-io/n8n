/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PushMessage, PushType } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { ErrorReporter, Logger } from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
	WorkflowExecuteMode,
	ExecutionStatus,
	IExecuteFunctions,
	ITaskDataConnections,
	ExecuteWorkflowOptions,
	IWorkflowExecutionDataProcess,
	EnvProviderState,
	ExecuteWorkflowData,
	RelatedExecution,
	Workflow,
} from 'n8n-workflow';
import { Container } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { CredentialsHelper } from '@/credentials-helper';
import type { AiEventMap, AiEventPayload } from '@/events/maps/ai.event-map';
import type { IWorkflowErrorData } from '@/interfaces';
import { Push } from '@/push';
import { findSubworkflowStart } from '@/utils';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowRepository } from './databases/repositories/workflow.repository';
import { EventService } from './events/event.service';
import { SecretsHelper } from './secrets-helpers.ee';
import { OwnershipService } from './services/ownership.service';
import { UrlService } from './services/url.service';
import { TaskRequester } from './task-runners/task-managers/task-requester';
import { WorkflowRunner } from './workflow-runner';
import { WorkflowExecutionService } from './workflows/workflow-execution.service';

/**
 * Checks if there was an error and if errorWorkflow or a trigger is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow got started in
 * @param {string} [executionId] The id the execution got saved as
 */
export function executeErrorWorkflow(
	workflowData: IWorkflowBase,
	fullRunData: IRun,
	mode: WorkflowExecuteMode,
	executionId?: string,
	retryOf?: string,
): void {
	const logger = Container.get(Logger);

	// Check if there was an error and if so if an errorWorkflow or a trigger is set
	let pastExecutionUrl: string | undefined;
	if (executionId !== undefined) {
		pastExecutionUrl = `${Container.get(UrlService).getWebhookBaseUrl()}workflow/${
			workflowData.id
		}/executions/${executionId}`;
	}

	if (fullRunData.data.resultData.error !== undefined) {
		let workflowErrorData: IWorkflowErrorData;
		const workflowId = workflowData.id;

		if (executionId) {
			// The error did happen in an execution
			workflowErrorData = {
				execution: {
					id: executionId,
					url: pastExecutionUrl,
					error: fullRunData.data.resultData.error,
					lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
					mode,
					retryOf,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		} else {
			// The error did happen in a trigger
			workflowErrorData = {
				trigger: {
					error: fullRunData.data.resultData.error,
					mode,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		}

		const { errorTriggerType } = Container.get(GlobalConfig).nodes;
		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		const { errorWorkflow } = workflowData.settings ?? {};
		if (errorWorkflow && !(mode === 'error' && workflowId && errorWorkflow === workflowId)) {
			logger.debug('Start external error workflow', {
				executionId,
				errorWorkflowId: errorWorkflow,
				workflowId,
			});
			// If a specific error workflow is set run only that one

			// First, do permission checks.
			if (!workflowId) {
				// Manual executions do not trigger error workflows
				// So this if should never happen. It was added to
				// make sure there are no possible security gaps
				return;
			}

			Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
						errorWorkflow,
						workflowErrorData,
						project,
					);
				})
				.catch((error: Error) => {
					Container.get(ErrorReporter).error(error);
					logger.error(
						`Could not execute ErrorWorkflow for execution ID ${this.executionId} because of error querying the workflow owner`,
						{
							executionId,
							errorWorkflowId: errorWorkflow,
							workflowId,
							error,
							workflowErrorData,
						},
					);
				});
		} else if (
			mode !== 'error' &&
			workflowId !== undefined &&
			workflowData.nodes.some((node) => node.type === errorTriggerType)
		) {
			logger.debug('Start internal error workflow', { executionId, workflowId });
			void Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
						workflowId,
						workflowErrorData,
						project,
					);
				});
		}
	}
}

export async function getRunData(
	workflowData: IWorkflowBase,
	inputData?: INodeExecutionData[],
	parentExecution?: RelatedExecution,
): Promise<IWorkflowExecutionDataProcess> {
	const mode = 'integrated';

	const startingNode = findSubworkflowStart(workflowData.nodes);

	// Always start with empty data if no inputData got supplied
	inputData = inputData || [
		{
			json: {},
		},
	];

	// Initialize the incoming data
	const nodeExecutionStack: IExecuteData[] = [];
	nodeExecutionStack.push({
		node: startingNode,
		data: {
			main: [inputData],
		},
		metadata: { parentExecution },
		source: null,
	});

	const runExecutionData: IRunExecutionData = {
		startData: {},
		resultData: {
			runData: {},
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack,
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		parentExecution,
	};

	return {
		executionMode: mode,
		executionData: runExecutionData,
		workflowData,
	};
}

export async function getWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new ApplicationError(
			'No information about the workflow to execute found. Please provide either the "id" or "code"!',
		);
	}

	let workflowData: IWorkflowBase | null;
	if (workflowInfo.id !== undefined) {
		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		workflowData = await Container.get(WorkflowRepository).get(
			{ id: workflowInfo.id },
			{ relations },
		);

		if (workflowData === undefined || workflowData === null) {
			throw new ApplicationError('Workflow does not exist.', {
				extra: { workflowId: workflowInfo.id },
			});
		}
	} else {
		workflowData = workflowInfo.code ?? null;
		if (workflowData) {
			if (!workflowData.id) {
				workflowData.id = parentWorkflowId;
			}
			if (!workflowData.settings) {
				workflowData.settings = parentWorkflowSettings;
			}
		}
	}

	return workflowData!;
}

/**
 * Executes a sub-workflow with the given ID
 */
export async function executeSubWorkflow(
	workflowInfo: IExecuteWorkflowInfo,
	additionalData: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
): Promise<ExecuteWorkflowData> {
	const activeExecutions = Container.get(ActiveExecutions);

	const workflowData =
		options.loadedWorkflowData ??
		(await getWorkflowData(workflowInfo, options.parentWorkflowId, options.parentWorkflowSettings));

	const runData =
		options.loadedRunData ??
		(await getRunData(workflowData, options.inputData, options.parentExecution));

	const executionId = await activeExecutions.add(runData);

	const executionPromise = Container.get(WorkflowRunner).runSubWorkflow(
		additionalData,
		options,
		executionId,
		runData,
		workflowData,
	);

	if (options.doNotWaitToFinish) {
		return { executionId, data: [null] };
	}

	return await executionPromise;
}

export function setExecutionStatus(status: ExecutionStatus) {
	const logger = Container.get(Logger);
	if (this.executionId === undefined) {
		logger.debug(`Setting execution status "${status}" failed because executionId is undefined`);
		return;
	}
	logger.debug(`Setting execution status for ${this.executionId} to "${status}"`);
	Container.get(ActiveExecutions).setStatus(this.executionId, status);
}

export function sendDataToUI(type: PushType, data: IDataObject | IDataObject[]) {
	const { pushRef } = this;
	if (pushRef === undefined) {
		return;
	}

	// Push data to session which started workflow
	try {
		const pushInstance = Container.get(Push);
		pushInstance.send({ type, data } as PushMessage, pushRef);
	} catch (error) {
		const logger = Container.get(Logger);
		logger.warn(`There was a problem sending message to UI: ${error.message}`);
	}
}

/**
 * Returns the base additional data without webhooks
 */
export async function getBase(
	userId?: string,
	currentNodeParameters?: INodeParameters,
	executionTimeoutTimestamp?: number,
): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = Container.get(UrlService).getWebhookBaseUrl();

	const globalConfig = Container.get(GlobalConfig);

	const variables = await WorkflowHelpers.getVariables();

	const eventService = Container.get(EventService);

	return {
		credentialsHelper: Container.get(CredentialsHelper),
		executeSubWorkflow,
		restApiUrl: urlBaseWebhook + globalConfig.endpoints.rest,
		instanceBaseUrl: urlBaseWebhook,
		formWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.formWaiting,
		webhookBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhook,
		webhookWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookWaiting,
		webhookTestBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookTest,
		currentNodeParameters,
		executionTimeoutTimestamp,
		userId,
		setExecutionStatus,
		variables,
		secretsHelpers: Container.get(SecretsHelper),
		async startRunnerTask(
			additionalData: IWorkflowExecuteAdditionalData,
			jobType: string,
			settings: unknown,
			executeFunctions: IExecuteFunctions,
			inputData: ITaskDataConnections,
			node: INode,
			workflow: Workflow,
			runExecutionData: IRunExecutionData,
			runIndex: number,
			itemIndex: number,
			activeNodeName: string,
			connectionInputData: INodeExecutionData[],
			siblingParameters: INodeParameters,
			mode: WorkflowExecuteMode,
			envProviderState: EnvProviderState,
			executeData?: IExecuteData,
		) {
			return await Container.get(TaskRequester).startTask(
				additionalData,
				jobType,
				settings,
				executeFunctions,
				inputData,
				node,
				workflow,
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				siblingParameters,
				mode,
				envProviderState,
				executeData,
			);
		},
		logAiEvent: (eventName: keyof AiEventMap, payload: AiEventPayload) =>
			eventService.emit(eventName, payload),
	};
}
