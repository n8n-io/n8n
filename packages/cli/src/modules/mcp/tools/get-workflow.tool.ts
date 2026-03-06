import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema, tagSchema } from './schemas';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowId: z.string().describe('The unique identifier of the workflow'),
	name: z.string().nullable().describe('The name of the workflow'),
	description: z.string().nullable().describe('The description of the workflow'),
	active: z.boolean().describe('Whether the workflow is active'),
	workflowJson: workflowJsonSchema.describe(
		'The workflow JSON containing nodes and connections, compatible with builder tools',
	),
	tags: z.array(tagSchema).describe('Tags associated with the workflow'),
	nodeCount: z.number().int().min(0).describe('Total number of nodes in the workflow'),
	connectionCount: z
		.number()
		.int()
		.min(0)
		.describe('Total number of source nodes with connections'),
} satisfies z.ZodRawShape;

/**
 * Creates mcp tool definition for retrieving a specific workflow by ID.
 * Returns the full workflow JSON (nodes + connections) suitable for editing with builder tools.
 * Unlike get_workflow_details, this does not check availableInMCP and returns workflowJson
 * in the format expected by add_node, connect_nodes, etc.
 */
export const createGetWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'get_workflow',
		config: {
			description:
				'Get a workflow by ID, returning the full workflow JSON (nodes and connections) for viewing or editing. The returned workflowJson can be passed directly to builder tools like add_node, connect_nodes, remove_node, etc.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Workflow',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ workflowId }: { workflowId: string }) => {
			const parameters = { workflowId };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'get_workflow',
				parameters,
			};

			try {
				const payload = await getWorkflow(user, workflowFinderService, { workflowId });

				telemetryPayload.results = {
					success: true,
					data: {
						workflow_id: payload.workflowId,
						workflow_name: payload.name,
						node_count: payload.nodeCount,
						connection_count: payload.connectionCount,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					structuredContent: payload,
					content: [{ type: 'text', text: JSON.stringify(payload) }],
				};
			} catch (error) {
				telemetryPayload.results = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				throw error;
			}
		},
	};
};

export async function getWorkflow(
	user: User,
	workflowFinderService: WorkflowFinderService,
	{ workflowId }: { workflowId: string },
) {
	const workflow = await workflowFinderService.findWorkflowForUser(
		workflowId,
		user,
		['workflow:read'],
		{ includeActiveVersion: true },
	);

	if (!workflow || workflow.isArchived) {
		throw new UserError('Workflow not found');
	}

	const nodes = workflow.activeVersion?.nodes ?? [];
	const connections = workflow.activeVersion?.connections ?? {};

	return {
		workflowId: workflow.id,
		name: workflow.name,
		description: workflow.description ?? null,
		active: workflow.activeVersionId !== null,
		workflowJson: { nodes, connections },
		tags: (workflow.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
		nodeCount: nodes.length,
		connectionCount: Object.keys(connections).length,
	};
}
