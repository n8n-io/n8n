/**
 * Which node types this instance actually uses, read from the dependency index rather than by
 * fetching workflows. Answers "how does this instance normally do X" for a fraction of the tokens
 * a sample of real workflows would cost.
 *
 * Unlike the activity tools beside it, this does not hide workflows withheld from MCP. The line
 * this surface draws is that a workflow's existence and name are already visible — `search_workflows`
 * lists withheld ones and simply reports the flag — while what has *happened* to one is not, which
 * is why the activity feed and the execution search both filter. Names and counts sit on the
 * visible side of that line.
 */
import type { User } from '@n8n/db';
import z from 'zod';

import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

const MAX_RESULTS = 100;

export const GET_NODE_USAGE_TOOL_NAME = 'get_node_usage';

const inputSchema = {
	nodeType: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Fully qualified node type, e.g. "n8n-nodes-base.httpRequest". Given one, returns the workflows using it. Omitted, returns the histogram of every node type in use.',
		),
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Read one project instead of every workflow you can see. Obtain it from search_projects.',
		),
	limit: createLimitSchema(MAX_RESULTS),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowsInScope: z
		.number()
		.int()
		.min(0)
		.describe(
			'Indexed, non-archived workflows the counts are drawn from — the denominator. A count means nothing without it.',
		),
	nodeTypes: z
		.array(
			z.object({
				nodeType: z.string().describe('Fully qualified node type'),
				workflowCount: z.number().int().min(0).describe('Workflows in scope using it'),
			}),
		)
		.optional()
		.describe('The histogram, returned when no nodeType was named. Most used first.'),
	workflows: z
		.array(
			z.object({
				workflowId: z.string(),
				name: z.string(),
				updatedAt: z.string().describe('ISO timestamp of the last change'),
			}),
		)
		.optional()
		.describe('Workflows using the named nodeType, returned when one was given.'),
	truncated: z
		.boolean()
		.optional()
		.describe(
			'The limit cut the list short. On the histogram this also means an absent node type may be in use but unshown, so do not report absence as evidence when it is set.',
		),
} satisfies z.ZodRawShape;

type GetNodeUsageParams = {
	nodeType?: string;
	projectId?: string;
	limit?: number;
};

export const createGetNodeUsageTool = (
	user: User,
	workflowDependencyQueryService: WorkflowDependencyQueryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: GET_NODE_USAGE_TOOL_NAME,
	config: {
		description:
			'Which node types this instance already uses, and how widely. Call it before choosing ' +
			'between equivalent nodes so a new workflow matches how this instance already builds — ' +
			'for example whether HTTP Request or a dedicated integration node is the local habit. ' +
			'Without nodeType it returns the histogram of node types in use; with one, the ' +
			'workflows using it. Counts come with the denominator they are counted against. ' +
			'Counts of node types only — never parameter values or credentials.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Node Usage',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ nodeType, projectId, limit }: GetNodeUsageParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: GET_NODE_USAGE_TOOL_NAME,
			parameters: { nodeType, projectId, limit },
		};

		try {
			const usage = await workflowDependencyQueryService.getNodeTypeUsage(user, {
				...(nodeType !== undefined ? { nodeType } : {}),
				...(projectId !== undefined ? { projectId } : {}),
				...(limit !== undefined ? { limit: Math.min(Math.max(1, limit), MAX_RESULTS) } : {}),
			});

			const payload = {
				workflowsInScope: usage.workflowsInScope,
				...(usage.nodeTypes ? { nodeTypes: usage.nodeTypes } : {}),
				...(usage.workflows
					? {
							workflows: usage.workflows.map((workflow) => ({
								workflowId: workflow.workflowId,
								name: workflow.name,
								updatedAt: workflow.updatedAt.toISOString(),
							})),
						}
					: {}),
				...(usage.truncated ? { truncated: true } : {}),
			};

			telemetryPayload.results = {
				success: true,
				data: { workflowsInScope: payload.workflowsInScope },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
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
