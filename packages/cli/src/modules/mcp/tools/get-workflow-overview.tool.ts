import { type User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import { mermaidStringify } from '@n8n/ai-workflow-builder/dist/tools/utils/mermaid.utils';
import { isTriggerNodeType } from '@n8n/ai-workflow-builder/dist/utils/node-helpers';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The current workflow JSON'),
	format: z
		.enum(['mermaid', 'summary'])
		.optional()
		.default('mermaid')
		.describe('Output format: "mermaid" for a flowchart diagram, "summary" for a text summary'),
	includeParameters: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether to include node parameters in the output'),
} satisfies z.ZodRawShape;

export const createGetWorkflowOverviewTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_workflow_overview',
	config: {
		description:
			'Get an overview of a workflow as a Mermaid diagram or text summary. Use this to understand the current state of a workflow being built.',
		inputSchema,
		annotations: {
			title: 'Get Workflow Overview',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowJson, format = 'mermaid', includeParameters = false }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_workflow_overview',
			parameters: { format, includeParameters },
		};

		try {
			const { nodes, connections } = workflowJson;
			const nodeCount = nodes.length;
			let connectionCount = 0;

			for (const sourceConns of Object.values(connections)) {
				for (const typeConns of Object.values(sourceConns)) {
					for (const outputConns of typeConns) {
						if (outputConns) {
							connectionCount += outputConns.length;
						}
					}
				}
			}

			const hasTrigger = nodes.some((n) => isTriggerNodeType(n.type));

			let overview: string;

			if (format === 'mermaid') {
				overview = mermaidStringify(
					{ workflow: { nodes, connections } },
					{
						includeNodeParameters: includeParameters,
						includeNodeType: true,
						includeNodeName: true,
						includeNodeId: true,
					},
				);
			} else {
				const nodeList = nodes.map((n) => `- ${n.name} (${n.type})`).join('\n');
				overview = `Workflow Summary:\nNodes (${nodeCount}):\n${nodeList}\nConnections: ${connectionCount}\nHas trigger: ${hasTrigger}`;
			}

			const payload = {
				overview,
				nodeCount,
				connectionCount,
				hasTrigger,
			};

			telemetryPayload.results = {
				success: true,
				data: { nodeCount, connectionCount, format },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
				structuredContent: payload,
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
});
