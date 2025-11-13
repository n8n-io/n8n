import type { User } from '@n8n/db';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IRunExecutionData,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
	UserError,
	UnexpectedError,
} from 'n8n-workflow';
import z from 'zod';

import { SUPPORTED_MCP_TRIGGERS, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { isWorkflowEligibleForMCPAccess } from '../mcp.utils';

import type { ActiveExecutions } from '@/active-executions';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to execute'),
	inputs: z
		.object({
			chatInput: z.string().optional().describe('Input for chat-based workflows'),
			formData: z.record(z.unknown()).optional().describe('Input data for form-based workflows'),
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
				.optional()
				.describe('Input data for webhook-based workflows'),
		})
		.optional()
		.describe('Inputs to provide to the workflow'),
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
	result: z.any().optional().describe('Workflow execution result data'),
	error: z.unknown().optional(),
} satisfies z.ZodRawShape;

export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'execute_workflow',
	config: {
		description: 'Execute a workflow by id',
		inputSchema: inputSchema.shape,
		outputSchema,
	},
	handler: async ({ workflowId, inputs }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'execute_workflow',
			parameters: { workflowId, inputs },
		};
		try {
			const output = await executeWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				workflowId,
				inputs,
			);

			telemetryPayload.results = {
				success: output.success,
				data: {
					executionId: output.executionId,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const payload: ExecuteWorkflowOutput = {
				success: false,
				executionId: null,
				error,
			};

			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
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
	workflowId: string,
	inputs?: z.infer<typeof inputSchema>['inputs'],
): Promise<ExecuteWorkflowOutput> => {
	const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
		'workflow:read',
	]);

	if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
		throw new UserError('Workflow not found');
	}

	const canExecuteWorkflow = isWorkflowEligibleForMCPAccess(workflow);

	if (!canExecuteWorkflow) {
		throw new UserError(
			`Only workflows with the following trigger nodes can be executed: ${Object.values(SUPPORTED_MCP_TRIGGERS).join(', ')}.`,
		);
	}

	const triggerNode = findMcpWorkflowStart(workflow.nodes);

	if (!triggerNode) {
		throw new UserError('No supported trigger node found to start the workflow execution.');
	}

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: getExecutionModeForTrigger(triggerNode),
		workflowData: workflow,
		userId: user.id,
	};

	// Set the trigger node as the start node and pin data for it
	// This will enable us to run the workflow from the trigger node with the provided inputs without waiting for an actual trigger event
	runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
	runData.pinData = getPinDataForTrigger(triggerNode, inputs ?? {});

	const executionId = await workflowRunner.run(runData);

	if (!executionId) {
		return {
			success: false,
			executionId: null,
		};
	}
	const data = await activeExecutions.getPostExecutePromise(executionId);

	if (data === undefined) {
		throw new UnexpectedError('Workflow did not return any data');
	}

	return {
		success: data.status !== 'error' && !data.data.resultData?.error,
		executionId,
		result: data.data.resultData,
		error: data.data.resultData?.error,
	};
};

/**
 * Gets the first supported trigger node from the workflow nodes.
 */
const findMcpWorkflowStart = (nodes: INode[]): INode | undefined => {
	return nodes.find((node) => {
		return !node.disabled && Object.keys(SUPPORTED_MCP_TRIGGERS).includes(node.type);
	});
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
const getPinDataForTrigger = (
	node: INode,
	inputs: z.infer<typeof inputSchema>['inputs'],
): IPinData => {
	if (!inputs) return {};

	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							headers: inputs.webhookData?.headers ?? {},
							query: inputs.webhookData?.query ?? {},
							body: inputs.webhookData?.body ?? {},
							executionMode: 'webhook',
						},
					},
				],
			};
		case CHAT_TRIGGER_NODE_TYPE:
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
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'mcp',
							...(inputs?.formData ?? {}),
						},
					},
				],
			};
		default:
			return {};
	}
};
