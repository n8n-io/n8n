/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PushMessage, PushType } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { Logger, WorkflowExecute } from 'n8n-core';
import { ApplicationError, Workflow } from 'n8n-workflow';
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
	ExecutionError,
	IExecuteFunctions,
	ITaskDataConnections,
	ExecuteWorkflowOptions,
	IWorkflowExecutionDataProcess,
	EnvProviderState,
	ExecuteWorkflowData,
	RelatedExecution,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { EventService } from '@/events/event.service';
import type { AiEventMap, AiEventPayload } from '@/events/maps/ai.event-map';
import { getWorkflowHooksIntegrated } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExternalHooks } from '@/external-hooks';
import type { UpdateExecutionPayload } from '@/interfaces';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { SecretsHelper } from '@/secrets-helpers.ee';
import { UrlService } from '@/services/url.service';
import { SubworkflowPolicyChecker } from '@/subworkflows/subworkflow-policy-checker.service';
import { TaskRequester } from '@/task-runners/task-managers/task-requester';
import { PermissionChecker } from '@/user-management/permission-checker';
import { findSubworkflowStart } from '@/utils';
import { objectToError } from '@/utils/object-to-error';
import * as WorkflowHelpers from '@/workflow-helpers';

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
		const relations = Container.get(GlobalConfig).tags.disabled ? [] : ['tags'];

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
 * Executes the workflow with the given ID
 */
export async function executeWorkflow(
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
		active: workflowData.active,
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

	let data;
	try {
		await Container.get(PermissionChecker).check(workflowData.id, workflowData.nodes);
		await Container.get(SubworkflowPolicyChecker).check(
			workflow,
			options.parentWorkflowId,
			options.node,
			additionalData.userId,
		);

		// Create new additionalData to have different workflow loaded and to call
		// different webhooks
		const additionalDataIntegrated = await getBase();
		additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(
			runData.executionMode,
			executionId,
			workflowData,
			additionalData.userId,
		);
		additionalDataIntegrated.executionId = executionId;
		additionalDataIntegrated.parentCallbackManager = options.parentCallbackManager;

		// Make sure we pass on the original executeWorkflow function we received
		// This one already contains changes to talk to parent process
		// and get executionID from `activeExecutions` running on main process
		additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;

		let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
		const workflowSettings = workflowData.settings;
		if (workflowSettings?.executionTimeout !== undefined && workflowSettings.executionTimeout > 0) {
			// We might have received a max timeout timestamp from the parent workflow
			// If we did, then we get the minimum time between the two timeouts
			// If no timeout was given from the parent, then we use our timeout.
			subworkflowTimeout = Math.min(
				additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
				Date.now() + workflowSettings.executionTimeout * 1000,
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
		const executionError = error ? (error as ExecutionError) : undefined;
		const fullRunData: IRun = {
			data: {
				resultData: {
					error: executionError,
					runData: {},
				},
			},
			finished: false,
			mode: 'integrated',
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'error',
		};
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
				stack: executionError?.stack,
				message: executionError?.message,
			},
			workflow,
		);
	}

	const externalHooks = Container.get(ExternalHooks);
	await externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);

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
