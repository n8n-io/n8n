import type { User } from '@n8n/db';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IWorkflowExecutionDataProcess,
	UserError,
	UnexpectedError,
} from 'n8n-workflow';
import z from 'zod';

import { SUPPORTED_MCP_TRIGGERS } from '../mcp.constants';
import type { ToolDefinition } from '../mcp.types';
import { isWorkflowEligibleForMCPAccess } from '../mcp.utils';

import type { ActiveExecutions } from '@/active-executions';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const workflowInputs = {
	chatInput: z.string().optional().describe('Input for chat-based workflows'),
	formData: z.record(z.unknown()).optional().describe('Input data for form-based workflows'),
	webhookData: z
		.object({
			body: z.record(z.unknown()).optional().describe('Request body data (main webhook payload)'),
			headers: z
				.record(z.string())
				.optional()
				.describe('HTTP headers (e.g., authorization, content-type)'),
			query: z.record(z.string()).optional().describe('Query string parameters'),
			params: z.record(z.string()).optional().describe('URL path parameters'),
			method: z
				.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
				.optional()
				.default('POST')
				.describe('HTTP method (defaults to POST)'),
		})
		.optional()
		.describe('Input data for webhook-based workflows'),
} satisfies z.ZodRawShape;

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to execute'),
	inputs: z.object(workflowInputs).optional().describe('Inputs to provide to the workflow'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	executionId: z.string().nullable().optional(),
	result: z.record(z.unknown()).nullable().optional(),
	error: z.unknown().optional(),
} satisfies z.ZodRawShape;

// TODO: Add telemetry
export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
): ToolDefinition<typeof inputSchema> => ({
	name: 'execute_workflow',
	config: {
		description: 'Execute a workflow by id',
		inputSchema,
		outputSchema,
	},
	handler: async ({ workflowId, inputs }) => {
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

		// Prepare run data for execution
		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData: workflow,
			userId: user.id,
		};

		// Set the trigger node as the start node
		runData.startNodes = [{ name: triggerNode.name, sourceData: null }];

		// Set inputs as pin data for the trigger node
		runData.pinData = getPinDataForTrigger(triggerNode, inputs ?? {});

		const executionId = await workflowRunner.run(runData);

		if (!executionId) {
			const payload = {
				success: false,
				executionId: null,
				message: 'Failed to start execution: no execution ID returned.',
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		}
		const data = await activeExecutions.getPostExecutePromise(executionId);

		if (data === undefined) {
			throw new UnexpectedError('Workflow did not return any data');
		}

		return {
			content: [{ type: 'text', text: JSON.stringify(data) }],
			structuredContent: {
				success: data?.status !== 'error',
				executionId,
				result: data?.data?.resultData,
				error: data?.data?.resultData?.error,
			},
		};
	},
});

const findMcpWorkflowStart = (nodes: INode[]): INode | undefined => {
	return nodes.find((node) => {
		return !node.disabled && Object.keys(SUPPORTED_MCP_TRIGGERS).includes(node.type);
	});
};

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
							headers: inputs.webhookInput?.headers ?? {},
							params: inputs.webhookInput?.params ?? {},
							query: inputs.webhookInput?.query ?? {},
							body: inputs.webhookInput?.body ?? {},
							executionMode: 'manual',
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
