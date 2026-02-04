import { Time } from '@n8n/constants';
import type { User, WorkflowRepository } from '@n8n/db';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IRunExecutionData,
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

import { SUPPORTED_MCP_TRIGGERS, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import type {
	ExecuteWorkflowsInputMeta,
	ToolDefinition,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import { findMcpSupportedTrigger } from '../mcp.utils';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds; // 5 minutes
const ERROR_KEYS_TO_IGNORE = ['stack', 'node'];

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to execute'),
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
	success: boolean;
	executionId: string | null;
	result?: IRunExecutionData['resultData'];
	error?: unknown;
};

const outputSchema = {
	success: z.boolean(),
	executionId: z.string().nullable().optional(),
	result: z.unknown().optional().describe('Workflow execution result data'),
	error: z.unknown().optional(),
} satisfies z.ZodRawShape;

export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowRepository: WorkflowRepository,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	telemetry: Telemetry,
	mcpService: McpService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'execute_workflow',
	config: {
		description:
			'Execute a workflow by ID. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description',
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
	handler: async ({ workflowId, inputs }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'execute_workflow',
			parameters: { workflowId, inputs: getInputMetaData(inputs) },
		};
		try {
			const output = await executeWorkflow(
				user,
				workflowFinderService,
				workflowRepository,
				activeExecutions,
				workflowRunner,
				mcpService,
				workflowId,
				inputs,
			);

			telemetryPayload.results = {
				success: output.success,
				data: {
					executionId: output.executionId,
				},
			};
			if (!output.success && output.error) {
				telemetryPayload.results.error = JSON.stringify(
					output.error,
					(key: string, value: unknown) => (ERROR_KEYS_TO_IGNORE.includes(key) ? undefined : value),
				);
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
				success: false,
				executionId: isTimeout ? error.executionId : null,
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
	workflowRepository: WorkflowRepository,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	mcpService: McpService,
	workflowId: string,
	inputs?: z.infer<typeof inputSchema>['inputs'],
): Promise<ExecuteWorkflowOutput> => {
	// Check if user has permission to access the workflow
	const workflow = await workflowFinderService.findWorkflowForUser(
		workflowId,
		user,
		['workflow:execute'],
		{ includeActiveVersion: true },
	);

	if (!workflow) {
		const workflowExists = await workflowRepository.existsBy({ id: workflowId });
		if (!workflowExists) {
			throw new WorkflowAccessError(
				`Workflow with ID '${workflowId}' does not exist`,
				'workflow_does_not_exist',
			);
		}

		// Workflow exists but user doesn't have permission
		throw new WorkflowAccessError(
			`You don't have permission to execute workflow '${workflowId}'`,
			'no_permission',
		);
	}

	if (workflow.isArchived) {
		throw new WorkflowAccessError(
			`Workflow '${workflowId}' is archived and cannot be executed`,
			'workflow_archived',
		);
	}

	if (!workflow.settings?.availableInMCP) {
		throw new WorkflowAccessError(
			'Workflow is not available for execution via MCP. Enable access in the workflow settings to make it available.',
			'not_available_in_mcp',
		);
	}

	const nodes = workflow.activeVersion?.nodes ?? [];
	const connections = workflow.activeVersion?.connections ?? {};

	const triggerNode = findMcpSupportedTrigger(nodes);

	if (!triggerNode) {
		throw new WorkflowAccessError(
			`Only workflows with the following trigger nodes can be executed: ${Object.values(SUPPORTED_MCP_TRIGGERS).join(', ')}.`,
			'unsupported_trigger',
		);
	}

	// Generate a unique MCP message ID for this execution (used for queue mode correlation)
	const mcpMessageId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: getExecutionModeForTrigger(triggerNode),
		workflowData: { ...workflow, nodes, connections },
		userId: user.id,
		// MCP metadata for queue mode support
		isMcpExecution: mcpService.isQueueMode,
		mcpType: 'service',
		mcpSessionId: mcpMessageId, // Using messageId as sessionId for MCP Service (no persistent session)
		mcpMessageId,
	};

	// Set the trigger node as the start node and pin data for it
	// This will enable us to run the workflow from the trigger node with the provided inputs without waiting for an actual trigger event
	runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
	runData.pinData = await getPinDataForTrigger(triggerNode, inputs);

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

	const executionId = await workflowRunner.run(runData);

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

		const success = data.status !== 'error' && !data.data.resultData?.error;

		return {
			success,
			executionId,
			result: data.data.resultData,
			error: data.data.resultData?.error,
		};
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
