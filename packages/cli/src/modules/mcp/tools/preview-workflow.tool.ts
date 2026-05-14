import { WORKFLOW_DIAGRAM_URI, type PreviewWorkflowOutput } from '@n8n/mcp-apps/server';
import type { User } from '@n8n/db';
import { ensureError, jsonStringify } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { MCP_PREVIEW_WORKFLOW_TOOL } from './workflow-builder/constants';
import { buildPreviewWorkflowOutput } from './workflow-preview.utils';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { NodeTypes } from '@/node-types';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to preview'),
} satisfies z.ZodRawShape;

const previewConnectionSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const previewNodeIconSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('file'), src: z.string() }),
	z.object({ type: z.literal('icon'), name: z.string(), color: z.string().optional() }),
	z.object({ type: z.literal('unknown') }),
]);

const previewNodeDisplaySchema = z.discriminatedUnion('variant', [
	z.object({
		variant: z.literal('stickyNote'),
		width: z.number(),
		height: z.number(),
		content: z.string().optional(),
		color: z.number().optional(),
	}),
	z.object({ variant: z.literal('node') }),
]);

const outputSchema = {
	workflowId: z.string().describe('The ID of the workflow being previewed'),
	workflowUrl: z.string().describe('Absolute URL to open the workflow in n8n'),
	name: z.string().describe('The name of the workflow'),
	nodes: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				icon: previewNodeIconSchema,
				display: previewNodeDisplaySchema.optional(),
				position: z.tuple([z.number(), z.number()]),
			}),
		)
		.describe('Workflow nodes stripped to display-safe fields'),
	connections: z
		.record(z.record(z.array(z.array(previewConnectionSchema).nullable())))
		.describe('Workflow connections keyed by source node'),
} satisfies z.ZodRawShape;

export const createPreviewWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_PREVIEW_WORKFLOW_TOOL.toolName,
	config: {
		description:
			'Renders a visual preview of a workflow. Call after creating or updating a workflow to show the user a diagram.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_PREVIEW_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		_meta: {
			ui: { resourceUri: WORKFLOW_DIAGRAM_URI },
		},
	},
	handler: async ({ workflowId }: { workflowId: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_PREVIEW_WORKFLOW_TOOL.toolName,
			parameters: { workflowId },
		};

		try {
			const output = await previewWorkflow(
				workflowId,
				user,
				workflowFinderService,
				nodeTypes,
				instanceBaseUrl,
				loadNodesAndCredentials,
			);

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: output.workflowId,
					workflow_name: output.name,
					node_count: output.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: `Showing workflow ${output.name} (${output.nodes.length} nodes)`,
					},
				],
				structuredContent: output,
			};
		} catch (e) {
			const error = ensureError(e);
			const isAccessError = error instanceof WorkflowAccessError;

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify({ error: error.message }) }],
				structuredContent: { error: error.message },
				isError: true,
			};
		}
	},
});

export async function previewWorkflow(
	workflowId: string,
	user: User,
	workflowFinderService: WorkflowFinderService,
	nodeTypes: NodeTypes,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<PreviewWorkflowOutput> {
	const workflow = await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	return await buildPreviewWorkflowOutput({
		workflow,
		instanceBaseUrl,
		nodeTypes,
		loadNodesAndCredentials,
	});
}
