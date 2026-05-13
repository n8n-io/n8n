import {
	WORKFLOW_DIAGRAM_URI,
	type PreviewWorkflowConnections,
	type PreviewWorkflowOutput,
} from '@n8n/mcp-apps/server';
import type { User } from '@n8n/db';
import { ensureError, jsonStringify, type IConnections, type INode } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { MCP_PREVIEW_WORKFLOW_TOOL } from './workflow-builder/constants';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to preview'),
} satisfies z.ZodRawShape;

const previewConnectionSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const outputSchema = {
	workflowId: z.string().describe('The ID of the workflow being previewed'),
	name: z.string().describe('The name of the workflow'),
	nodes: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
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
			const output = await previewWorkflow(workflowId, user, workflowFinderService);

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
): Promise<PreviewWorkflowOutput> {
	const workflow = await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	return {
		workflowId: workflow.id,
		name: workflow.name,
		nodes: (workflow.nodes ?? []).map(({ name, type, position }) => ({
			name,
			type,
			position: normalizePosition(position),
		})),
		connections: sanitizeConnections(workflow.connections ?? {}),
	};
}

function normalizePosition(position: INode['position']): [number, number] {
	const [x, y] = position;
	return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

function sanitizeConnections(connections: IConnections): PreviewWorkflowConnections {
	const sanitized: PreviewWorkflowConnections = {};

	for (const [sourceNodeName, outputsByType] of Object.entries(connections)) {
		sanitized[sourceNodeName] = {};

		for (const [connectionType, outputGroups] of Object.entries(outputsByType)) {
			sanitized[sourceNodeName][connectionType] = outputGroups.map(
				(connectionsForOutput) =>
					connectionsForOutput?.map(({ node, type, index }) => ({ node, type, index })) ?? null,
			);
		}
	}

	return sanitized;
}
