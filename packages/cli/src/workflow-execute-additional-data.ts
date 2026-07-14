/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { PushMessage, PushType } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import { ExecutionsConfig, GlobalConfig, SsrfProtectionConfig, WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import type { ServiceIdentifier } from '@n8n/di';
import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import { ExternalSecretsProxy, WorkflowExecute } from 'n8n-core';
import type {
	AiEvent,
	EnvProviderState,
	ExecuteAgentData,
	ExecuteAgentWorkflowContext,
	ExecuteWorkflowData,
	ExecuteWorkflowOptions,
	ExecutionError,
	ExecutionStatus,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRun,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecutionDataProcess,
	IWorkflowSettings,
	RelatedExecution,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	OperationalError,
	UnexpectedError,
	Workflow,
	createRunExecutionData,
	mergeRunsPerBranch,
	attachDynamicCredentialsUsage,
	summarizeDynamicCredentialsUsage,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import { EventService } from '@/events/event.service';
import type { AiEventPayload } from '@/events/maps/ai.event-map';
import { getLifecycleHooksForSubExecutions } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { isManualOrChatExecution } from '@/executions/execution.utils';
import { FailedRunFactory } from '@/executions/failed-run-factory';
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
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import { RuntimeCredentialProxyService } from './services/runtime-credential-proxy.service';

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
	// For a workflow loaded from the database, read the published version from the
	// workflow_published_version table when the publication service is enabled.
	// (Inline code is returned as-is below.)
	//
	// TODO(CAT-3202): clean up the workflow data fetching
	if (
		workflowInfo.id !== undefined &&
		Container.get(WorkflowsConfig).useWorkflowPublicationService
	) {
		const publishedData = await Container.get(
			WorkflowPublishedDataService,
		).getPublishedWorkflowData(workflowInfo.id);
		if (publishedData === null) {
			throw new OperationalError('Workflow is not active and cannot be executed.', {
				extra: { workflowId: workflowInfo.id, parentWorkflowId },
			});
		}
		return {
			...publishedData.workflow,
			nodes: publishedData.publishedVersion.nodes,
			connections: publishedData.publishedVersion.connections,
		};
	}

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
 * Determines a workflow's deadline given its start time, its settings
 * and global execution config.
 */
function determineWorkflowDeadline(
	startTime: number,
	workflowSettings: IWorkflowSettings | undefined,
	executionsConfig: ExecutionsConfig,
): number | undefined {
	const effectiveMaxTimeout =
		executionsConfig.maxTimeout > 0 ? executionsConfig.maxTimeout : Infinity;

	if (workflowSettings?.executionTimeout !== undefined) {
		// A defined timeout of <= 0 means the workflow's own timeout is explicitly
		// disabled, so it runs unbounded rather than falling back to the global
		// default. Otherwise it is clamped to the configurable maximum. This mirrors
		// the main-workflow path in workflow-runner.ts and job-processor.ts.
		if (workflowSettings.executionTimeout <= 0) {
			return undefined;
		}
		return (
			startTime +
			Math.min(workflowSettings.executionTimeout, effectiveMaxTimeout) * Time.seconds.toMilliseconds
		);
	}
	if (executionsConfig.timeout > 0) {
		return (
			startTime +
			Math.min(executionsConfig.timeout, effectiveMaxTimeout) * Time.seconds.toMilliseconds
		);
	}
	return undefined;
}

/**
 * Resolves a sub-workflow deadline depending on its parent.
 */
function resolveSubworkflowDeadline(
	subWorkflowDeadline: number | undefined,
	parentDeadline: number | undefined,
	doNotWaitToFinish: boolean | undefined,
): number | undefined {
	if (doNotWaitToFinish) {
		return subWorkflowDeadline;
	}
	if (parentDeadline !== undefined && subWorkflowDeadline !== undefined) {
		return Math.min(parentDeadline, subWorkflowDeadline);
	}
	return parentDeadline ?? subWorkflowDeadline;
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

/**
 * Executes an agent with the given ID and message.
 */
export async function executeAgent(
	agentId: string,
	message: string,
	executionId: string,
	threadId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	executionMode: WorkflowExecuteMode,
	outputSchema?: JSONSchema7,
	workflowContext?: ExecuteAgentWorkflowContext,
): Promise<ExecuteAgentData> {
	const telemetryUserId = additionalData.userId;
	let projectId = additionalData.projectId;

	// Trigger-fired and webhook executions build `additionalData` without a
	// `projectId` (see `getBase` callers in `active-workflow-manager`,
	// `webhooks/*`, `scaling/job-processor`). Resolve it from the workflow's
	// owning project so the agent runs under the correct project scope.
	if (!projectId && additionalData.workflowId) {
		const { OwnershipService } = await import('@/services/ownership.service');
		const ownershipService = Container.get(OwnershipService);
		const project = await ownershipService.getWorkflowProjectCached(additionalData.workflowId);
		projectId = project.id;
	}

	if (!projectId) {
		throw new UnexpectedError(
			'Cannot execute agent without a projectId or workflowId in additional data',
		);
	}

	const { AgentExecutionOrchestratorService } = await import(
		'@/modules/agents/agent-execution-orchestrator.service'
	);
	const agentExecutionOrchestratorService = Container.get(AgentExecutionOrchestratorService);

	const useDraftVersion = isManualOrChatExecution(executionMode);

	return await agentExecutionOrchestratorService.executeForWorkflow(
		agentId,
		message,
		executionId,
		threadId,
		projectId,
		telemetryUserId,
		useDraftVersion,
		outputSchema,
		workflowContext,
	);
}

async function listAgents(userId: string): Promise<Array<{ id: string; name: string }>> {
	const { AgentsService } = await import('@/modules/agents/agents.service');
	const agentsService = Container.get(AgentsService);
	// Only published agents are runnable from a published workflow.
	// But unpublished agents may be called from manual workflow executions (e.g. during development), so they are included in the list as well.
	const agents = await agentsService.findByUser(userId);
	return agents.map((agent) => ({
		id: agent.id,
		name: agent.name,
	}));
}

/**
 * Whether the sub-workflow's `Execute Workflow Trigger` wants the legacy single-run output.
 * v1.2+ triggers always opt into the new merged-runs default;
 * pre-1.2 triggers can opt in via the `returnOutput` parameter
 * and otherwise stay on `lastRunOnly` for backward compatibility.
 * Sub-workflows without an `Execute Workflow Trigger` keep the legacy output too.
 * See n8n-io/n8n#9989
 */
export function triggerReturnsLastRunOnly(nodes: INode[]): boolean {
	const trigger = nodes.find((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger');
	const triggerVersion = trigger?.typeVersion ?? 1;
	return triggerVersion < 1.2 && trigger?.parameters?.returnOutput !== 'allRuns';
}

/**
 * Returns the items the parent workflow gets back from the sub-workflow's last node.
 * By default, items from every run of the terminal node are concatenated per output branch.
 * The trigger declares its preference.
 * The caller can additionally force the legacy single-run output via `returnLastRunOnly`
 * (used by LangChain tool/retriever callers that need a single-answer output).
 * Pinned data on the last node always wins in manual mode.
 * See n8n-io/n8n#9989.
 */
export function buildSubWorkflowOutput(
	data: IRun,
	workflowNodes: INode[],
	callerReturnsLastRunOnly: boolean,
): Array<INodeExecutionData[] | null> {
	const lastRunOnly = callerReturnsLastRunOnly || triggerReturnsLastRunOnly(workflowNodes);
	const runs = WorkflowHelpers.getLastExecutedNodeRuns(data);
	const { lastNodeExecuted, pinData = {} } = data.data.resultData;
	const manualPinDataOverride =
		data.mode === 'manual' &&
		lastNodeExecuted !== undefined &&
		pinData[lastNodeExecuted] !== undefined;

	if (!lastRunOnly && runs.length > 0 && !manualPinDataOverride) {
		return mergeRunsPerBranch(runs);
	}
	return WorkflowHelpers.getLastExecutedNodeData(data)?.data?.main ?? [null];
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
		additionalDataIntegrated.executeAgent = additionalData.executeAgent;
		additionalDataIntegrated.listAgents = additionalData.listAgents;
		// Propagate the root execution mode so nested subworkflows retain the original
		// mode (e.g. 'manual') even though their own WorkflowExecute runs as 'integrated'
		additionalDataIntegrated.rootExecutionMode =
			additionalData.rootExecutionMode ?? options.executionMode;
		// Propagate the eval run id so sub-workflows of an eval run expose `$evaluation.runId`
		additionalDataIntegrated.evaluationRunId = additionalData.evaluationRunId;
		if (additionalData.httpResponse) {
			additionalDataIntegrated.httpResponse = additionalData.httpResponse;
		}
		// Propagate streaming state to subworkflows
		additionalDataIntegrated.streamingEnabled = additionalData.streamingEnabled;

		const executionsConfig = Container.get(ExecutionsConfig);

		const subworkflowDeadline = resolveSubworkflowDeadline(
			determineWorkflowDeadline(startTime, workflowSettings, executionsConfig),
			additionalData.executionTimeoutTimestamp,
			options.doNotWaitToFinish,
		);

		additionalDataIntegrated.executionTimeoutTimestamp = subworkflowDeadline;

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
		const fullRunData = Container.get(FailedRunFactory).generateFailedExecutionFromError(
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

		await Container.get(ExecutionPersistence).updateExistingExecution(
			executionId,
			fullExecutionData,
		);
		// The engine mutates `runData.executionData` in place, so a mid-run crash may leave
		// credential flags on already-executed tasks — ride them on the error like the
		// regular failure path below.
		throw attachDynamicCredentialsUsage(
			objectToError(
				{
					...executionError,
					executionId,
					workflowId: workflowData.id,
					stack: executionError?.stack,
					message: executionError?.message,
				},
				workflow,
			),
			summarizeDynamicCredentialsUsage(runData.executionData),
		);
	}

	// subworkflow either finished, or is in status waiting due to a wait node, both cases are considered successes here
	if (data.finished === true || data.status === 'waiting') {
		// Workflow did finish successfully

		activeExecutions.finalizeExecution(executionId, data);

		return {
			executionId,
			data: buildSubWorkflowOutput(data, workflowData.nodes, options.returnLastRunOnly ?? false),
			waitTill: data.waitTill,
			// Report private-credential usage to the caller (detached runs return earlier, skipping this).
			...summarizeDynamicCredentialsUsage(data.data),
		};
	}
	activeExecutions.finalizeExecution(executionId, data);

	// Workflow did fail
	const { error } = data.data.resultData;

	// A failed child may still have attempted or resolved private credentials before failing;
	// ride the usage on the error so a continue-on-fail caller still flags its task
	// (see `BaseExecuteContext.executeWorkflow`).
	throw attachDynamicCredentialsUsage(
		objectToError(
			{
				...error,
				executionId,
				workflowId: workflowData.id,
				stack: error?.stack,
			},
			workflow,
		),
		summarizeDynamicCredentialsUsage(data.data),
	);
}

export function setExecutionStatus(this: { executionId?: string }, status: ExecutionStatus) {
	const logger = Container.get(Logger);
	if (this.executionId === undefined) {
		logger.debug(`Setting execution status "${status}" failed because executionId is undefined`);
		return;
	}
	logger.debug(`Setting execution status for ${this.executionId} to "${status}"`);
	Container.get(ActiveExecutions).setStatus(this.executionId, status);
}

export function sendDataToUI(
	this: { pushRef?: string },
	type: PushType,
	data: IDataObject | IDataObject[],
) {
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
	const urlService = Container.get(UrlService);
	const urlBaseWebhook = urlService.getWebhookBaseUrl();
	const urlBaseTestWebhook = urlService.getTestWebhookBaseUrl();
	const instanceBaseUrl = urlService.getInstanceBaseUrl();

	const globalConfig = Container.get(GlobalConfig);

	const variables = await WorkflowHelpers.getVariables(workflowId, projectId);

	const eventService = Container.get(EventService);

	const additionalData: IWorkflowExecuteAdditionalData = {
		currentNodeExecutionIndex: 0,
		credentialsHelper: Container.get(CredentialsHelper),
		executeWorkflow,
		executeAgent,
		listAgents,
		restApiUrl: urlBaseWebhook + globalConfig.endpoints.rest,
		instanceBaseUrl: `${instanceBaseUrl}/`,
		formWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.formWaiting,
		webhookBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhook,
		webhookWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookWaiting,
		webhookTestBaseUrl: urlBaseTestWebhook + globalConfig.endpoints.webhookTest,
		mcpBaseUrl: urlBaseWebhook + globalConfig.endpoints.mcp,
		mcpTestBaseUrl: urlBaseTestWebhook + globalConfig.endpoints.mcpTest,
		currentNodeParameters,
		executionTimeoutTimestamp,
		userId,
		workflowId,
		projectId,
		setExecutionStatus,
		variables,
		workflowSettings,
		async getRuntimeCredential(runExecutionData, alias) {
			return await Container.get(RuntimeCredentialProxyService).getRuntimeCredential(
				runExecutionData,
				alias,
			);
		},
		async getRunExecutionData(executionId) {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionData = await executionPersistence.findSingleExecution(executionId, {
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
		logAiEvent: (eventName: AiEvent, payload: AiEventPayload) => {
			eventService.emit(eventName, payload);
		},
		getRunnerStatus: (taskType: string) =>
			Container.get(TaskRequester as ServiceIdentifier<TaskRequester>).getRunnerStatus(taskType),
	};

	const ssrfConfig = Container.get(SsrfProtectionConfig);
	if (ssrfConfig.enabled) {
		additionalData.ssrfBridge = Container.get(SsrfProtectionService);
	}

	for (const [moduleName, moduleContext] of Container.get(ModuleRegistry).context.entries()) {
		// @ts-expect-error Adding an index signature `[key: string]: unknown`
		// to `IWorkflowExecuteAdditionalData` triggers complex type errors for derived types.
		additionalData[moduleName] = moduleContext;
	}

	return additionalData;
}
