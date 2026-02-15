import type { RunningJobSummary } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	WorkflowHasIssuesError,
	InstanceSettings,
	WorkflowExecute,
	SupplyDataContext,
} from 'n8n-core';
import type { Tool } from '@langchain/core/tools';
import type {
	ExecutionStatus,
	IExecuteData,
	IExecuteResponsePromiseData,
	INodeExecutionData,
	IRun,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
	CloseFunction,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	NodeConnectionTypes,
	Workflow,
	UnexpectedError,
	createRunExecutionData,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import { EventService } from '@/events/event.service';
import { getLifecycleHooksForScalingWorker } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { getWorkflowActiveStatusFromWorkflowData } from '@/executions/execution.utils';
import { ManualExecutionService } from '@/manual-execution.service';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type {
	Job,
	JobFinishedMessage,
	JobFinishedProps,
	JobId,
	JobResult,
	RespondToWebhookMessage,
	McpResponseMessage,
	RunningJob,
	SendChunkMessage,
} from './scaling.types';

/**
 * Responsible for processing jobs from the queue, i.e. running enqueued executions.
 */
@Service()
export class JobProcessor {
	private readonly runningJobs: Record<JobId, RunningJob> = {};

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly instanceSettings: InstanceSettings,
		private readonly manualExecutionService: ManualExecutionService,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	async processJob(job: Job): Promise<JobResult> {
		const { executionId, loadStaticData } = job.data;

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new UnexpectedError(
				`Worker failed to find data for execution ${executionId} (job ${job.id})`,
			);
		}

		/**
		 * Bull's implicit retry mechanism and n8n's execution recovery mechanism may
		 * cause a crashed execution to be enqueued. We refrain from processing it,
		 * until we have reworked both mechanisms to prevent this scenario.
		 */
		if (execution.status === 'crashed') return { success: false };

		const workflowId = execution.workflowData.id;

		this.logger.info(`Worker started execution ${executionId} (job ${job.id})`, {
			executionId,
			workflowId,
			jobId: job.id,
		});

		const startedAt = await this.executionRepository.setRunning(executionId);

		let { staticData } = execution.workflowData;

		if (loadStaticData) {
			const workflowData = await this.workflowRepository.findOne({
				select: ['id', 'staticData'],
				where: { id: workflowId },
			});

			if (workflowData === null) {
				throw new UnexpectedError(
					`Worker failed to find workflow ${workflowId} to run execution ${executionId} (job ${job.id})`,
				);
			}

			staticData = workflowData.staticData;
		}

		const workflowSettings = execution.workflowData.settings ?? {};

		let workflowTimeout = workflowSettings.executionTimeout ?? this.executionsConfig.timeout;

		let executionTimeoutTimestamp: number | undefined;

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, this.executionsConfig.maxTimeout);
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}

		const workflow = new Workflow({
			id: workflowId,
			name: execution.workflowData.name,
			nodes: execution.workflowData.nodes,
			connections: execution.workflowData.connections,
			active: getWorkflowActiveStatusFromWorkflowData(execution.workflowData),
			nodeTypes: this.nodeTypes,
			staticData,
			settings: execution.workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId,
			executionTimeoutTimestamp,
			workflowSettings: execution.workflowData.settings,
		});
		additionalData.streamingEnabled = job.data.streamingEnabled;
		additionalData.restartExecutionId = job.data.restartExecutionId;

		const { pushRef } = job.data;

		const lifecycleHooks = getLifecycleHooksForScalingWorker(
			{
				executionMode: execution.mode,
				workflowData: execution.workflowData,
				retryOf: execution.retryOf,
				pushRef,
			},
			executionId,
		);
		additionalData.hooks = lifecycleHooks;

		if (pushRef) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({ pushRef });
		}

		lifecycleHooks.addHandler('sendResponse', async (response): Promise<void> => {
			// Check if this is an MCP execution - broadcast response to all mains
			if (job.data.isMcpExecution && job.data.mcpSessionId) {
				const msg: McpResponseMessage = {
					kind: 'mcp-response',
					executionId,
					mcpType: job.data.mcpType ?? 'service',
					sessionId: job.data.mcpSessionId,
					messageId: job.data.mcpMessageId ?? '',
					response,
					workerId: this.instanceSettings.hostId,
				};

				await job.progress(msg);
				return;
			}

			// Standard webhook response
			const msg: RespondToWebhookMessage = {
				kind: 'respond-to-webhook',
				executionId,
				response: this.encodeWebhookResponse(response),
				workerId: this.instanceSettings.hostId,
			};

			await job.progress(msg);
		});

		lifecycleHooks.addHandler('sendChunk', async (chunk: StructuredChunk): Promise<void> => {
			const msg: SendChunkMessage = {
				kind: 'send-chunk',
				executionId,
				chunkText: chunk,
				workerId: this.instanceSettings.hostId,
			};

			await job.progress(msg);
		});

		additionalData.executionId = executionId;

		additionalData.setExecutionStatus = (status: ExecutionStatus) => {
			// Can't set the status directly in the queued worker, but it will happen in InternalHook.onWorkflowPostExecute
			this.logger.debug(
				`Queued worker execution status for execution ${executionId} (job ${job.id}) is "${status}"`,
				{
					executionId,
					workflowId,
					jobId: job.id,
				},
			);
		};

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;

		const { startData, resultData, manualData } = execution.data;

		if (execution.data?.executionData) {
			workflowExecute = new WorkflowExecute(additionalData, execution.mode, execution.data);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			const data: IWorkflowExecutionDataProcess = {
				executionMode: execution.mode,
				workflowData: execution.workflowData,
				destinationNode: startData?.destinationNode,
				startNodes: startData?.startNodes,
				runData: resultData.runData,
				pinData: resultData.pinData,
				dirtyNodeNames: manualData?.dirtyNodeNames,
				triggerToStartFrom: manualData?.triggerToStartFrom,
				userId: manualData?.userId,
			};

			try {
				workflowRun = this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					resultData.pinData,
				);
			} catch (error) {
				if (error instanceof WorkflowHasIssuesError) {
					// execution did not even start, but we call `workflowExecuteAfter` to notify main

					const now = new Date();
					const runData: IRun = {
						mode: 'manual',
						status: 'error',
						finished: false,
						startedAt: now,
						stoppedAt: now,
						data: createRunExecutionData({ resultData: { error, runData: {} } }),
						storedAt: execution.storedAt,
					};

					await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);
					return { success: false };
				}
				throw error;
			}
		}

		const runningJob: RunningJob = {
			run: workflowRun,
			executionId,
			workflowId: execution.workflowId,
			workflowName: execution.workflowData.name,
			mode: execution.mode,
			startedAt,
			retryOf: execution.retryOf ?? undefined,
			status: execution.status,
		};

		this.runningJobs[job.id] = runningJob;

		const run = await workflowRun;

		delete this.runningJobs[job.id];

		const props = process.env.N8N_MINIMIZE_EXECUTION_DATA_FETCHING
			? this.deriveJobFinishedProps(run, startedAt)
			: await this.fetchJobFinishedResult(executionId);

		this.logger.info(`Worker finished execution ${executionId} (job ${job.id})`, {
			executionId,
			workflowId,
			jobId: job.id,
			success: props.success,
		});

		const msg: JobFinishedMessage = {
			kind: 'job-finished',
			version: 2,
			executionId,
			workerId: this.instanceSettings.hostId,
			...props,
		};

		await job.progress(msg);

		// For MCP Trigger executions with tool calls, execute the tool and send result
		if (
			job.data.isMcpExecution &&
			job.data.mcpType === 'trigger' &&
			job.data.mcpSessionId &&
			job.data.mcpToolCall?.sourceNodeName
		) {
			const { toolName, arguments: toolArgs, sourceNodeName } = job.data.mcpToolCall;

			let toolResult: unknown;
			try {
				toolResult = await this.invokeTool(workflow, sourceNodeName, toolArgs, additionalData);
			} catch (error) {
				this.logger.error('Tool node execution failed for MCP Trigger', {
					executionId,
					toolName,
					sourceNodeName,
					error: error instanceof Error ? error.message : String(error),
				});
				toolResult = {
					error:
						error instanceof Error
							? { message: error.message, name: error.name }
							: { message: String(error) },
				};
			}

			const mcpMsg: McpResponseMessage = {
				kind: 'mcp-response',
				executionId,
				mcpType: 'trigger',
				sessionId: job.data.mcpSessionId,
				messageId: job.data.mcpMessageId ?? '',
				response: toolResult, // Actual tool result
				workerId: this.instanceSettings.hostId,
			};

			await job.progress(mcpMsg);
		} else if (job.data.isMcpExecution && job.data.mcpSessionId) {
			// For MCP Service executions or MCP Trigger without tool call, send basic response
			const mcpMsg: McpResponseMessage = {
				kind: 'mcp-response',
				executionId,
				mcpType: job.data.mcpType ?? 'service',
				sessionId: job.data.mcpSessionId,
				messageId: job.data.mcpMessageId ?? '',
				response: { success: props.success },
				workerId: this.instanceSettings.hostId,
			};

			await job.progress(mcpMsg);
		}

		/**
		 * @important Do NOT call `workflowExecuteAfter` hook here.
		 * It is being called from processSuccessExecution() already.
		 */

		return { success: true };
	}

	private deriveJobFinishedProps(run: IRun, startedAt: Date): JobFinishedProps {
		return {
			success: run.status !== 'error' && run.data.resultData.error === undefined,
			status: run.status,
			error: run.data.resultData.error,
			startedAt,
			stoppedAt: run.stoppedAt!,
			lastNodeExecuted: run.data.resultData.lastNodeExecuted,
			usedDynamicCredentials: !!run.data.executionData?.runtimeData?.credentials,
			metadata: run.data.resultData.metadata,
		};
	}

	private async fetchJobFinishedResult(executionId: string): Promise<JobFinishedProps> {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new UnexpectedError(
				`Worker failed to find execution ${executionId} immediately after workflow completed`,
			);
		}

		return {
			success: execution.status !== 'error' && execution.data?.resultData?.error === undefined,
			status: execution.status,
			error: execution.data?.resultData?.error,
			startedAt: execution.startedAt,
			stoppedAt: execution.stoppedAt!,
			lastNodeExecuted: execution.data?.resultData?.lastNodeExecuted,
			usedDynamicCredentials: !!execution.data?.executionData?.runtimeData?.credentials,
			metadata: execution.data?.resultData?.metadata,
		};
	}

	stopJob(jobId: JobId) {
		const runningJob = this.runningJobs[jobId];
		if (!runningJob) return;

		const { executionId, workflowId, workflowName } = runningJob;
		this.eventService.emit('execution-cancelled', {
			executionId,
			workflowId,
			workflowName,
			reason: 'manual', // Job stops via scaling service are always user-initiated
		});

		runningJob.run.cancel();
		delete this.runningJobs[jobId];
	}

	getRunningJobIds(): JobId[] {
		return Object.keys(this.runningJobs);
	}

	getRunningJobsSummary(): RunningJobSummary[] {
		return Object.values(this.runningJobs).map(({ run, ...summary }) => summary);
	}

	private encodeWebhookResponse(
		response: IExecuteResponsePromiseData,
	): IExecuteResponsePromiseData {
		if (typeof response === 'object' && Buffer.isBuffer(response.body)) {
			response.body = {
				'__@N8nEncodedBuffer@__': response.body.toString(BINARY_ENCODING),
			};
		}

		return response;
	}

	/**
	 * Invoke a tool directly for MCP Trigger in queue mode.
	 * This method creates a SupplyDataContext, calls supplyData to get the Tool,
	 * and invokes it directly instead of running a full workflow execution.
	 */
	private async invokeTool(
		workflow: Workflow,
		sourceNodeName: string,
		toolArgs: Record<string, unknown>,
		additionalData: ReturnType<typeof WorkflowExecuteAdditionalData.getBase> extends Promise<
			infer T
		>
			? T
			: never,
	): Promise<unknown> {
		const toolNode = workflow.getNode(sourceNodeName);
		if (!toolNode) {
			throw new UnexpectedError(`Tool node "${sourceNodeName}" not found in workflow`);
		}

		// Get the node type
		const nodeType = this.nodeTypes.getByNameAndVersion(toolNode.type, toolNode.typeVersion);
		if (!nodeType.supplyData) {
			throw new UnexpectedError(`Tool node "${sourceNodeName}" does not have supplyData method`);
		}

		// Validate toolArgs is a proper object (not null/array) before using as input data
		const validatedToolArgs =
			typeof toolArgs === 'object' && toolArgs !== null && !Array.isArray(toolArgs) ? toolArgs : {};

		// Create input data for the tool node with the tool arguments
		const inputData: INodeExecutionData[][] = [
			[
				{
					json: validatedToolArgs as INodeExecutionData['json'],
				},
			],
		];

		// Create minimal run execution data
		const runExecutionData = createRunExecutionData({});

		// Create execute data for the tool node
		const executeData: IExecuteData = {
			node: toolNode,
			data: {
				main: inputData,
			},
			source: null,
		};

		const closeFunctions: CloseFunction[] = [];

		// Create SupplyDataContext for the tool node
		const context = new SupplyDataContext(
			workflow,
			toolNode,
			additionalData,
			'webhook',
			runExecutionData,
			0,
			inputData[0],
			{ main: inputData },
			NodeConnectionTypes.AiTool,
			executeData,
			closeFunctions,
		);

		try {
			const supplyDataResult = await nodeType.supplyData.call(context, 0);
			const tool = supplyDataResult.response as Tool;

			if (!tool || typeof tool.invoke !== 'function') {
				throw new UnexpectedError(`Tool node "${sourceNodeName}" did not return a valid Tool`);
			}

			const result = await tool.invoke(validatedToolArgs);

			return result;
		} finally {
			for (const closeFunction of closeFunctions) {
				try {
					await closeFunction();
				} catch (error) {
					this.logger.warn(`Error closing tool resource: ${error}`);
				}
			}
		}
	}
}
