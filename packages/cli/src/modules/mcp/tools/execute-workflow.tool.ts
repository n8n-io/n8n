import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IRun,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
	UnexpectedError,
	TimeoutExecutionCancelledError,
	ensureError,
	jsonStringify,
	SCHEDULE_TRIGGER_NODE_TYPE,
	createRunExecutionData,
} from 'n8n-workflow';
import z from 'zod';

import {
	SUPPORTED_MCP_TRIGGERS,
	SUPPORTED_PRODUCTION_MCP_TRIGGERS,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import type {
	ExecuteWorkflowsInputMeta,
	ToolDefinition,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import { findMcpSupportedTrigger } from '../mcp.utils';
import { getMcpWorkflow, type FoundWorkflow } from './workflow-validation.utils';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds; // 5 minutes

export { type FoundWorkflow };

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to execute'),
	executionMode: z
		.enum(['manual', 'production'])
		.optional()
		.default('production')
		.describe(
			'Use "manual" to test the current version of the workflow. Use "production" to execute the published (active) version.',
		),
	inputs: z
		.discriminatedUnion('type', [
			z.object({
				type: z.literal('chat'),
				chatInput: z.string().describe('Input for chat-based workflows'),
			}),
			z.object({
				type: z.literal('form'),
				formData: z.record(z.unknown()).describe('Input data for form-based workflows'),
			}),
			z.object({
				type: z.literal('webhook'),
				webhookData: z
					.object({
						method: z
							.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
							.optional()
							.default('GET')
							.describe('HTTP method (defaults to GET)'),
						query: z.record(z.string()).optional().describe('Query string parameters'),
						body: z
							.record(z.unknown())
							.optional()
							.describe('Request body data (main webhook payload)'),
						headers: z
							.record(z.string())
							.optional()
							.describe('HTTP headers (e.g., authorization, content-type)'),
					})
					.describe('Input data for webhook-based workflows'),
			}),
		])
		.optional()
		.describe('Inputs to provide to the workflow.'),
});

type ExecuteWorkflowOutput = {
	executionId: string | null;
	status: 'success' | 'error' | 'running' | 'waiting' | 'canceled' | 'crashed' | 'new' | 'unknown';
	error?: string;
};

const outputSchema = {
	executionId: z.string().nullable(),
	status: z
		.enum(['success', 'error', 'running', 'waiting', 'canceled', 'crashed', 'new', 'unknown'])
		.describe('The status of the execution'),
	error: z.string().optional().describe('Error message if the execution failed'),
} satisfies z.ZodRawShape;

export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	telemetry: Telemetry,
	mcpService: McpService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'execute_workflow',
	config: {
		description:
			'Execute a workflow by ID. Returns execution ID and status. To get the full execution results, use the get_execution tool with the returned execution ID. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Execute Workflow',
			readOnlyHint: false, // Can read and write data via workflows
			destructiveHint: true, // Can cause changes in external systems via workflows
			idempotentHint: true, // Safe to retry multiple times
			openWorldHint: true, // Can access external systems via workflows
		},
	},
	handler: async ({ workflowId, executionMode, inputs }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'execute_workflow',
			parameters: { workflowId, executionMode, inputs: getInputMetaData(inputs) },
		};
		try {
			const output = await executeWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				mcpService,
				workflowId,
				inputs,
				executionMode,
			);

			telemetryPayload.results = {
				success: output.status === 'success',
				data: {
					executionId: output.executionId,
					status: output.status,
				},
			};
			if (output.status === 'error' && output.error) {
				telemetryPayload.results.error = output.error;
			}
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isTimeout = error instanceof McpExecutionTimeoutError;
			const isAccessError = error instanceof WorkflowAccessError;

			const errorInfo: Record<string, unknown> = {
				message: error.message || 'Unknown error',
				name: error.constructor.name,
			};

			if ('extra' in error && error.extra) {
				errorInfo.extra = error.extra;
			}
			if (error.cause) {
				errorInfo.cause =
					error.cause instanceof Error ? error.cause.message : jsonStringify(error.cause);
			}

			const output: ExecuteWorkflowOutput = {
				executionId: isTimeout ? error.executionId : null,
				status: 'error',
				error: isTimeout
					? `Workflow execution timed out after ${WORKFLOW_EXECUTION_TIMEOUT_MS / Time.milliseconds.toSeconds} seconds (Enforced MCP timeout)`
					: (error.message ?? `${error.constructor.name}: (no message)`),
			};

			telemetryPayload.results = {
				success: false,
				error: isTimeout ? 'Workflow execution timed out' : errorInfo,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});

/**
 * Executes a workflow for the given user with provided inputs.
 * In order to "synchronously" execute the workflow,
 * it is mapping mcp tool inputs to trigger node pin data and starting execution from there.
 * LIMITATION: Does not properly support workflows with multiple triggers.
 */
export const executeWorkflow = async (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	mcpService: McpService,
	workflowId: string,
	inputs?: z.infer<typeof inputSchema>['inputs'],
	executionMode: z.infer<typeof inputSchema>['executionMode'] = 'production',
): Promise<ExecuteWorkflowOutput> => {
	const workflow = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:execute'],
		workflowFinderService,
		{ includeActiveVersion: true },
	);
	const runData = await buildRunData(
		workflow,
		user.id,
		workflowId,
		executionMode,
		inputs,
		mcpService,
	);

	const executionId = await workflowRunner.run(runData);
	const data = await waitForExecutionResult(executionId, activeExecutions, mcpService);
	const hasError = data.status === 'error' || data.data.resultData?.error;

	return {
		executionId,
		status: hasError ? 'error' : data.status,
		error: hasError
			? (data.data.resultData?.error?.message ?? 'Execution completed with errors')
			: undefined,
	};
};

const getVersionDataForExecution = (
	workflow: FoundWorkflow,
	workflowId: string,
	executionMode: z.infer<typeof inputSchema>['executionMode'],
) => {
	if (executionMode === 'production' && !workflow.activeVersionId) {
		throw new WorkflowAccessError(
			`Workflow '${workflowId}' has no published (active) version to execute`,
			'workflow_not_active',
		);
	}

	const nodes =
		executionMode === 'production' ? (workflow.activeVersion?.nodes ?? []) : (workflow.nodes ?? []);
	const connections =
		executionMode === 'production'
			? (workflow.activeVersion?.connections ?? {})
			: (workflow.connections ?? {});

	return { nodes, connections };
};

const buildRunData = async (
	workflow: FoundWorkflow,
	userId: string,
	workflowId: string,
	executionMode: z.infer<typeof inputSchema>['executionMode'],
	inputs: z.infer<typeof inputSchema>['inputs'],
	mcpService: McpService,
): Promise<IWorkflowExecutionDataProcess> => {
	const { nodes, connections } = getVersionDataForExecution(workflow, workflowId, executionMode);
	const triggerNode = findMcpSupportedTrigger(nodes, executionMode);

	if (!triggerNode) {
		throw new WorkflowAccessError(
			`Only workflows with the following trigger nodes can be executed: ${getSupportedTriggerNamesForMode(executionMode).join(', ')}.`,
			'unsupported_trigger',
		);
	}

	// Generate a unique MCP message ID for this execution (used for queue mode correlation)
	const mcpMessageId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

	const isManualExecution = executionMode === 'manual';
	const runData: IWorkflowExecutionDataProcess = {
		executionMode: isManualExecution ? 'manual' : getExecutionModeForTrigger(triggerNode),
		workflowData: { ...workflow, nodes, connections },
		userId,
		// MCP metadata for queue mode support
		isMcpExecution: mcpService.isQueueMode,
		mcpType: 'service',
		mcpSessionId: mcpMessageId, // Using messageId as sessionId for MCP Service (no persistent session)
		mcpMessageId,
	};

	// Set the trigger node as the start node and pin data for it
	// This will enable us to run the workflow from the trigger node with the provided inputs without waiting for an actual trigger event
	runData.startNodes = [{ name: triggerNode.name, sourceData: null }];

	const triggerPinData = await getPinDataForTrigger(triggerNode, inputs);
	const workflowPinData = isManualExecution ? (workflow.pinData ?? {}) : {};
	runData.pinData = { ...triggerPinData, ...workflowPinData };

	runData.executionData = createRunExecutionData({
		startData: {},
		resultData: {
			pinData: runData.pinData,
			runData: {},
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [
				{
					node: triggerNode,
					data: {
						main: [runData.pinData[triggerNode.name]],
					},
					source: null,
				},
			],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	});

	return runData;
};

const waitForExecutionResult = async (
	executionId: string,
	activeExecutions: ActiveExecutions,
	mcpService: McpService,
): Promise<IRun> => {
	// Create a timeout promise
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new McpExecutionTimeoutError(executionId, WORKFLOW_EXECUTION_TIMEOUT_MS));
		}, WORKFLOW_EXECUTION_TIMEOUT_MS);
	});

	// In queue mode, use the MCP service's pending response mechanism
	// In regular mode, use the standard activeExecutions promise
	const resultPromise = mcpService.isQueueMode
		? mcpService.createPendingResponse(executionId).promise
		: activeExecutions.getPostExecutePromise(executionId);

	try {
		const data = await Promise.race([resultPromise, timeoutPromise]);

		// Executed successfully before timeout: clear the timeout
		clearTimeout(timeoutId);

		if (data === undefined) {
			throw new UnexpectedError('Workflow did not return any data');
		}

		return data;
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId);

		if (mcpService.isQueueMode) {
			mcpService.removePendingResponse(executionId);
		}

		if (error instanceof McpExecutionTimeoutError) {
			try {
				const cancellationError = new TimeoutExecutionCancelledError(error.executionId!);
				activeExecutions.stopExecution(error.executionId!, cancellationError);
			} catch (stopError) {
				throw new UnexpectedError(
					`Failed to stop timed-out execution [id: ${error.executionId}]: ${ensureError(stopError).message}`,
				);
			}
		}
		// Re-throw the error to be handled by the caller
		throw error;
	}
};

/**
 * Gets the execution mode based on the trigger node type.
 */
const getExecutionModeForTrigger = (node: INode): WorkflowExecuteMode => {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case MANUAL_TRIGGER_NODE_TYPE:
			return 'manual';
		case FORM_TRIGGER_NODE_TYPE:
			return 'trigger';
		default:
			return 'trigger';
	}
};

/**
 * Constructs pin data for the trigger node based on provided inputs.
 */
const getPinDataForTrigger = async (
	node: INode,
	inputs: z.infer<typeof inputSchema>['inputs'],
): Promise<IPinData> => {
	switch (node.type) {
		case MANUAL_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [{ json: {} }],
			};
		case WEBHOOK_NODE_TYPE: {
			// For webhook triggers, provide default empty values if no inputs or wrong type
			const webhookData = inputs?.type === 'webhook' ? inputs.webhookData : undefined;
			return {
				[node.name]: [
					{
						json: {
							headers: webhookData?.headers ?? {},
							query: webhookData?.query ?? {},
							body: webhookData?.body ?? {},
						},
					},
				],
			};
		}
		case CHAT_TRIGGER_NODE_TYPE:
			if (!inputs || inputs.type !== 'chat') return {};
			return {
				[node.name]: [
					{
						json: {
							sessionId: `mcp-session-${Date.now()}`,
							action: 'sendMessage',
							chatInput: inputs.chatInput,
						},
					},
				],
			};
		case FORM_TRIGGER_NODE_TYPE:
			if (!inputs || inputs.type !== 'form') return {};
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'mcp',
							...(inputs.formData ?? {}),
						},
					},
				],
			};
		case SCHEDULE_TRIGGER_NODE_TYPE: {
			// For schedule triggers, we don't map any inputs but we can add expected datetime info
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const moment = (await import('moment-timezone')).default;
			const momentTz = moment.tz(timezone);
			return {
				[node.name]: [
					{
						json: {
							timestamp: momentTz.toISOString(true),
							'Readable date': momentTz.format('MMMM Do YYYY, h:mm:ss a'),
							'Readable time': momentTz.format('h:mm:ss a'),
							'Day of week': momentTz.format('dddd'),
							Year: momentTz.format('YYYY'),
							Month: momentTz.format('MMMM'),
							'Day of month': momentTz.format('DD'),
							Hour: momentTz.format('HH'),
							Minute: momentTz.format('mm'),
							Second: momentTz.format('ss'),
							Timezone: `${timezone} (UTC${momentTz.format('Z')})`,
						},
					},
				],
			};
		}
		default:
			return {};
	}
};

const getSupportedTriggerNamesForMode = (
	executionMode: z.infer<typeof inputSchema>['executionMode'],
): string[] => {
	return executionMode === 'production'
		? Object.values(SUPPORTED_PRODUCTION_MCP_TRIGGERS)
		: Object.values(SUPPORTED_MCP_TRIGGERS);
};

/**
 * Reduce inputs to metadata that will be sent to telemetry.
 */
const getInputMetaData = (
	inputs: z.infer<typeof inputSchema>['inputs'],
): ExecuteWorkflowsInputMeta | undefined => {
	if (!inputs) {
		return undefined;
	}
	switch (inputs.type) {
		case 'chat':
			return {
				type: 'chat',
				parameter_count: 1,
			};
		case 'form':
			return {
				type: 'form',
				parameter_count: Object.keys(inputs.formData ?? {}).length,
			};
		case 'webhook':
			return {
				type: 'webhook',
				parameter_count: [
					inputs.webhookData?.body ? Object.keys(inputs.webhookData.body).length : 0,
					inputs.webhookData?.query ? Object.keys(inputs.webhookData.query).length : 0,
					inputs.webhookData?.headers ? Object.keys(inputs.webhookData.headers).length : 0,
				].reduce((a, b) => a + b, 0),
			};
		default:
			return undefined;
	}
};
