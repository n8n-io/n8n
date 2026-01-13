/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PushMessage, PushType } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy, WorkflowExecute } from 'n8n-core';
import { UnexpectedError, Workflow, createRunExecutionData } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
	WorkflowExecuteMode,
	ExecutionStatus,
	ExecutionError,
	IExecuteFunctions,
	ITaskDataConnections,
	ExecuteWorkflowOptions,
	IWorkflowExecutionDataProcess,
	EnvProviderState,
	ExecuteWorkflowData,
	RelatedExecution,
	IRunExecutionData,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import { EventService } from '@/events/event.service';
import type { AiEventMap, AiEventPayload } from '@/events/maps/ai.event-map';
import { getLifecycleHooksForSubExecutions } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExecutionDataService } from '@/executions/execution-data.service';
import { isManualOrChatExecution } from '@/executions/execution.utils';
import {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import type { UpdateExecutionPayload } from '@/interfaces';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';
import { TaskRequester } from '@/task-runners/task-managers/task-requester';
import { findSubworkflowStart } from '@/utils';
import { objectToError } from '@/utils/object-to-error';
import * as WorkflowHelpers from '@/workflow-helpers';

export function getRunData(
	workflowData: IWorkflowBase,
	inputData?: INodeExecutionData[],
	parentExecution?: RelatedExecution,
): IWorkflowExecutionDataProcess {
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

	const runExecutionData = createRunExecutionData({
		executionData: {
			nodeExecutionStack,
		},
		parentExecution,
	});

	return {
		executionMode: mode,
		executionData: runExecutionData,
		workflowData,
	};
}

/**
 * Fetches workflow from database or returns provided code.
 * Shared helper for getDraftWorkflowData and getPublishedWorkflowData.
 */
async function fetchWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId: string,
	parentWorkflowSettings?: IWorkflowSettings,
) {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new UnexpectedError(
			'No information about the workflow to execute found. Please provide either the "id" or "code"!',
		);
	}

	if (workflowInfo.id !== undefined) {
		const baseRelations = ['activeVersion'];
		const relations = Container.get(GlobalConfig).tags.disabled
			? [...baseRelations]
			: [...baseRelations, 'tags'];

		const workflowFromDb = await Container.get(WorkflowRepository).get(
			{ id: workflowInfo.id },
			{ relations },
		);

		if (workflowFromDb === undefined || workflowFromDb === null) {
			throw new UnexpectedError('Workflow does not exist.', {
				extra: { workflowId: workflowInfo.id },
			});
		}

		return workflowFromDb;
	} else {
		const workflowData = workflowInfo.code;
		if (workflowData) {
			if (!workflowData.id) {
				workflowData.id = parentWorkflowId;
			}
			workflowData.settings ??= parentWorkflowSettings;
		}
		return workflowData;
	}
}

/**
 * Loads draft workflow data for sub-workflow execution.
 * Used for manual/chat executions to allow iterating on sub-workflows without publishing.
 * Always uses the draft version (nodes/connections from WorkflowEntity).
 */
export async function getDraftWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	const workflowData = await fetchWorkflowData(
		workflowInfo,
		parentWorkflowId,
		parentWorkflowSettings,
	);
	return workflowData!;
}

/**
 * Loads published workflow data for sub-workflow execution.
 * Used for production executions - requires the workflow to have an active (published) version.
 * Uses nodes/connections from the activeVersion in WorkflowHistory.
 */
export async function getPublishedWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	const workflowData = await fetchWorkflowData(
		workflowInfo,
		parentWorkflowId,
		parentWorkflowSettings,
	);

	// If workflow was provided as code, return as-is
	if (workflowInfo.code !== undefined) {
		return workflowData!;
	}

	// For workflows from database, ensure active version exists and use it
	if (workflowData && 'activeVersion' in workflowData && workflowData.activeVersion) {
		return {
			...workflowData,
			nodes: workflowData.activeVersion.nodes,
			connections: workflowData.activeVersion.connections,
		};
	}

	throw new UnexpectedError('Workflow is not active and cannot be executed.', {
		extra: { workflowId: workflowInfo.id },
	});
}

/**
 * Executes the workflow with the given ID
 */
export async function executeWorkflow(
	workflowInfo: IExecuteWorkflowInfo,
	additionalData: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
): Promise<ExecuteWorkflowData> {
	const activeExecutions = Container.get(ActiveExecutions);

	// Use draft sub-workflows for manual/chat executions to enable
	// iterating on sub-workflows without requiring them to be published
	const useDraftVersion = isManualOrChatExecution(options.executionMode);

	const workflowData =
		options.loadedWorkflowData ??
		(useDraftVersion
			? await getDraftWorkflowData(
					workflowInfo,
					options.parentWorkflowId,
					options.parentWorkflowSettings,
				)
			: await getPublishedWorkflowData(
					workflowInfo,
					options.parentWorkflowId,
					options.parentWorkflowSettings,
				));

	const runData =
		options.loadedRunData ?? getRunData(workflowData, options.inputData, options.parentExecution);

	const executionId = await activeExecutions.add(runData);

	Container.get(EventService).emit('workflow-executed', {
		user: additionalData.userId ? { id: additionalData.userId } : undefined,
		workflowId: workflowData.id,
		workflowName: workflowData.name,
		executionId,
		source: 'integrated',
	});

	const executionPromise = startExecution(
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

async function startExecution(
	additionalData: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
	executionId: string,
	runData: IWorkflowExecutionDataProcess,
	workflowData: IWorkflowBase,
): Promise<ExecuteWorkflowData> {
	const nodeTypes = Container.get(NodeTypes);
	const activeExecutions = Container.get(ActiveExecutions);
	const executionRepository = Container.get(ExecutionRepository);

	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new Workflow({
		id: workflowData.id,
		name: workflowName,
		nodes: workflowData.nodes,
		connections: workflowData.connections,
		active: workflowData.activeVersionId !== null,
		nodeTypes,
		staticData: workflowData.staticData,
		settings: workflowData.settings,
	});

	/**
	 * A subworkflow execution in queue mode is not enqueued, but rather runs in the
	 * same worker process as the parent execution. Hence ensure the subworkflow
	 * execution is marked as started as well.
	 */
	await executionRepository.setRunning(executionId);

	const startTime = Date.now();

	let data;
	try {
		await Container.get(CredentialsPermissionChecker).check(workflowData.id, workflowData.nodes);
		await Container.get(SubworkflowPolicyChecker).check(
			workflow,
			options.parentWorkflowId,
			options.node,
			additionalData.userId,
		);

		// Create new additionalData to have different workflow loaded and to call
		// different webhooks
		const workflowSettings = workflowData.settings;
		const additionalDataIntegrated = await getBase({
			workflowId: workflowData.id,
			workflowSettings,
		});
		additionalDataIntegrated.hooks = getLifecycleHooksForSubExecutions(
			runData.executionMode,
			executionId,
			workflowData,
			additionalData.userId,
			options.parentExecution,
		);
		additionalDataIntegrated.executionId = executionId;
		additionalDataIntegrated.parentCallbackManager = options.parentCallbackManager;

		// Make sure we pass on the original executeWorkflow function we received
		// This one already contains changes to talk to parent process
		// and get executionID from `activeExecutions` running on main process
		additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;
		if (additionalData.httpResponse) {
			additionalDataIntegrated.httpResponse = additionalData.httpResponse;
		}
		// Propagate streaming state to subworkflows
		additionalDataIntegrated.streamingEnabled = additionalData.streamingEnabled;

		let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
		if (workflowSettings?.executionTimeout !== undefined && workflowSettings.executionTimeout > 0) {
			// We might have received a max timeout timestamp from the parent workflow
			// If we did, then we get the minimum time between the two timeouts
			// If no timeout was given from the parent, then we use our timeout.
			subworkflowTimeout = Math.min(
				additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
				startTime + workflowSettings.executionTimeout * 1000,
			);
		}

		additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;

		const runExecutionData = runData.executionData as IRunExecutionData;

		// Execute the workflow
		const workflowExecute = new WorkflowExecute(
			additionalDataIntegrated,
			runData.executionMode,
			runExecutionData,
		);
		const execution = workflowExecute.processRunExecutionData(workflow);
		activeExecutions.attachWorkflowExecution(executionId, execution);
		data = await execution;
	} catch (error) {
		const executionError = error as ExecutionError;
		const fullRunData = Container.get(ExecutionDataService).generateFailedExecutionFromError(
			runData.executionMode,
			executionError,
			'node' in executionError ? executionError.node : undefined,
			startTime,
		);

		// When failing, we might not have finished the execution
		// Therefore, database might not contain finished errors.
		// Force an update to db as there should be no harm doing this

		const fullExecutionData: UpdateExecutionPayload = {
			data: fullRunData.data,
			mode: fullRunData.mode,
			finished: fullRunData.finished ? fullRunData.finished : false,
			startedAt: fullRunData.startedAt,
			stoppedAt: fullRunData.stoppedAt,
			status: fullRunData.status,
			workflowData,
			workflowId: workflowData.id,
		};
		if (workflowData.id) {
			fullExecutionData.workflowId = workflowData.id;
		}

		activeExecutions.finalizeExecution(executionId, fullRunData);

		await executionRepository.updateExistingExecution(executionId, fullExecutionData);
		throw objectToError(
			{
				...executionError,
				executionId,
				workflowId: workflowData.id,
				stack: executionError?.stack,
				message: executionError?.message,
			},
			workflow,
		);
	}

	// subworkflow either finished, or is in status waiting due to a wait node, both cases are considered successes here
	if (data.finished === true || data.status === 'waiting') {
		// Workflow did finish successfully

		activeExecutions.finalizeExecution(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return {
			executionId,
			data: returnData!.data!.main,
			waitTill: data.waitTill,
		};
	}
	activeExecutions.finalizeExecution(executionId, data);

	// Workflow did fail
	const { error } = data.data.resultData;

	throw objectToError(
		{
			...error,
			executionId,
			workflowId: workflowData.id,
			stack: error?.stack,
		},
		workflow,
	);
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
 * @returns {IWorkflowExecuteAdditionalData}
 * param userId - The ID of the user executing the workflow, if available
 * param workflowId - The ID of the workflow being executed, if available
 * param projectId - The ID of the project the workflow is owned by, if available
 * param currentNodeParameters - The parameters of the currently executing node
 * param executionTimeoutTimestamp - The timestamp (in ms) when the execution should time out
 */
export async function getBase({
	userId,
	workflowId,
	projectId,
	currentNodeParameters,
	executionTimeoutTimestamp,
	workflowSettings,
}: {
	userId?: string;
	workflowId?: string;
	projectId?: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	workflowSettings?: IWorkflowSettings;
} = {}): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = Container.get(UrlService).getWebhookBaseUrl();

	const globalConfig = Container.get(GlobalConfig);

	const variables = await WorkflowHelpers.getVariables(workflowId, projectId);

	const eventService = Container.get(EventService);

	const additionalData: IWorkflowExecuteAdditionalData = {
		currentNodeExecutionIndex: 0,
		credentialsHelper: Container.get(CredentialsHelper),
		executeWorkflow,
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
		workflowSettings,
		async getRunExecutionData(executionId) {
			const executionRepository = Container.get(ExecutionRepository);
			const executionData = await executionRepository.findSingleExecution(executionId, {
				unflattenData: true,
				includeData: true,
			});

			return executionData?.data;
		},
		externalSecretsProxy: Container.get(ExternalSecretsProxy),
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
		getRunnerStatus: (taskType: string) => Container.get(TaskRequester).getRunnerStatus(taskType),
	};

	for (const [moduleName, moduleContext] of Container.get(ModuleRegistry).context.entries()) {
		// @ts-expect-error Adding an index signature `[key: string]: unknown`
		// to `IWorkflowExecuteAdditionalData` triggers complex type errors for derived types.
		additionalData[moduleName] = moduleContext;
	}

	return additionalData;
}
