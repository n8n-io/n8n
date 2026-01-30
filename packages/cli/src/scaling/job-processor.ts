import type { RunningJobSummary } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { WorkflowHasIssuesError, InstanceSettings, WorkflowExecute } from 'n8n-core';
import type {
	ExecutionStatus,
	IExecuteData,
	IExecuteResponsePromiseData,
	INodeExecutionData,
	IRun,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
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

		if (job.data.isMcpExecution) {
			this.logger.debug('MCP DEBUG: Worker picked up MCP execution', {
				executionId,
				workflowId,
				mcpSessionId: job.data.mcpSessionId,
				mcpMessageId: job.data.mcpMessageId,
				targetMainId: job.data.originMainId,
			});
		}

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
			// Check if this is an MCP execution - route response back to the originating main
			if (job.data.isMcpExecution && job.data.mcpSessionId && job.data.originMainId) {
				const msg: McpResponseMessage = {
					kind: 'mcp-response',
					executionId,
					mcpType: job.data.mcpType ?? 'service',
					sessionId: job.data.mcpSessionId,
					messageId: job.data.mcpMessageId ?? '',
					response,
					workerId: this.instanceSettings.hostId,
					targetMainId: job.data.originMainId,
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
			job.data.originMainId &&
			job.data.mcpToolCall?.sourceNodeName
		) {
			const { toolName, arguments: toolArgs, sourceNodeName } = job.data.mcpToolCall;

			this.logger.debug('MCP DEBUG: Worker executing tool node for MCP Trigger', {
				executionId,
				workflowId,
				toolName,
				sourceNodeName,
				mcpSessionId: job.data.mcpSessionId,
			});

			let toolResult: unknown;
			try {
				toolResult = await this.executeToolNode(
					workflow,
					sourceNodeName,
					toolArgs,
					additionalData,
					executionId,
				);
				this.logger.debug('MCP DEBUG: Tool node executed successfully', {
					executionId,
					toolName,
					sourceNodeName,
					hasResult: toolResult !== undefined,
				});
			} catch (error) {
				this.logger.error('MCP DEBUG: Tool node execution failed', {
					executionId,
					toolName,
					sourceNodeName,
					error: error instanceof Error ? error.message : String(error),
				});
				toolResult = { error: error instanceof Error ? error.message : String(error) };
			}

			const mcpMsg: McpResponseMessage = {
				kind: 'mcp-response',
				executionId,
				mcpType: 'trigger',
				sessionId: job.data.mcpSessionId,
				messageId: job.data.mcpMessageId ?? '',
				response: toolResult, // Actual tool result
				workerId: this.instanceSettings.hostId,
				targetMainId: job.data.originMainId,
			};

			await job.progress(mcpMsg);

			this.logger.debug('MCP DEBUG: Worker sent tool result to main', {
				executionId,
				workflowId,
				toolName,
				targetMainId: job.data.originMainId,
			});
		} else if (job.data.isMcpExecution && job.data.mcpSessionId && job.data.originMainId) {
			// For MCP Service executions or MCP Trigger without tool call, send basic response
			this.logger.debug('MCP DEBUG: Worker sending response back to main', {
				executionId,
				workflowId,
				success: props.success,
				mcpSessionId: job.data.mcpSessionId,
				targetMainId: job.data.originMainId,
			});

			const mcpMsg: McpResponseMessage = {
				kind: 'mcp-response',
				executionId,
				mcpType: job.data.mcpType ?? 'service',
				sessionId: job.data.mcpSessionId,
				messageId: job.data.mcpMessageId ?? '',
				response: { success: props.success },
				workerId: this.instanceSettings.hostId,
				targetMainId: job.data.originMainId,
			};

			await job.progress(mcpMsg);

			this.logger.debug('MCP DEBUG: Worker sent response to main successfully', {
				executionId,
				workflowId,
				targetMainId: job.data.originMainId,
			});
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
	 * Execute a tool node for MCP Trigger in queue mode.
	 * This method creates a minimal workflow execution to run just the tool node
	 * and extract its output.
	 */
	private async executeToolNode(
		workflow: Workflow,
		sourceNodeName: string,
		toolArgs: Record<string, unknown>,
		additionalData: ReturnType<typeof WorkflowExecuteAdditionalData.getBase> extends Promise<
			infer T
		>
			? T
			: never,
		executionId: string,
	): Promise<unknown> {
		const toolNode = workflow.getNode(sourceNodeName);
		if (!toolNode) {
			throw new UnexpectedError(`Tool node "${sourceNodeName}" not found in workflow`);
		}

		this.logger.debug('MCP DEBUG: Executing tool node', {
			sourceNodeName,
			toolArgs: JSON.stringify(toolArgs),
			executionId,
		});

		// Create input data for the tool node with the tool arguments
		// Cast toolArgs to IDataObject since it comes from JSON-RPC which is type-safe
		const inputData: INodeExecutionData[][] = [
			[
				{
					json: toolArgs as unknown as INodeExecutionData['json'],
				},
			],
		];

		// Create execution stack with just the tool node
		const nodeExecutionStack: IExecuteData[] = [
			{
				node: toolNode,
				data: {
					main: inputData,
				},
				source: null,
			},
		];

		// Create minimal run execution data for the tool node
		const toolRunData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
		});

		// Execute the tool node
		const workflowExecute = new WorkflowExecute(additionalData, 'webhook', toolRunData);
		const toolRun = await workflowExecute.processRunExecutionData(workflow);

		// Extract the tool node's output from the run data
		const nodeRunData = toolRun.data.resultData.runData[sourceNodeName];
		if (!nodeRunData || nodeRunData.length === 0) {
			this.logger.warn('MCP DEBUG: No run data found for tool node', {
				sourceNodeName,
				executionId,
			});
			return { error: 'Tool execution produced no output' };
		}

		// Get the output data from the last run
		const lastRun = nodeRunData[nodeRunData.length - 1];
		const outputData = lastRun.data?.[NodeConnectionTypes.Main]?.[0];

		if (!outputData || outputData.length === 0) {
			this.logger.warn('MCP DEBUG: Tool node output is empty', {
				sourceNodeName,
				executionId,
			});
			return { error: 'Tool execution produced empty output' };
		}

		// Return the JSON data from the first output item
		// For tools, typically there's a single output item with the result
		const result = outputData[0]?.json;

		this.logger.debug('MCP DEBUG: Tool node execution completed', {
			sourceNodeName,
			executionId,
			hasResult: result !== undefined,
		});

		return result;
	}
}
