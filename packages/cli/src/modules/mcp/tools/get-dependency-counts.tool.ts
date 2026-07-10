import type { DependencyResourceType, DependencyCountsBatchResponse } from '@n8n/api-types';
import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import type { Telemetry } from '@/telemetry';
import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';

const RESOURCE_TYPE_VALUES = ['workflow', 'credential', 'dataTable'] as const;

const inputSchema = {
	resourceIds: z
		.array(z.string())
		.min(1)
		.max(100)
		.describe('Array of resource IDs to query dependency counts for'),
	resourceType: z
		.enum(RESOURCE_TYPE_VALUES)
		.describe('The type of resources specified in resourceIds'),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.record(
			z.string(),
			z.object({
				credentialId: z.number().int().min(0),
				dataTableId: z.number().int().min(0),
				errorWorkflow: z.number().int().min(0),
				errorWorkflowParent: z.number().int().min(0),
				workflowCall: z.number().int().min(0),
				workflowParent: z.number().int().min(0),
			}),
		)
		.describe(
			'Map of resource ID to dependency counts. Only resources the user has access to are included.',
		),
} satisfies z.ZodRawShape;

type GetDependencyCountsParams = {
	resourceIds: string[];
	resourceType: DependencyResourceType;
};

export const createGetDependencyCountsTool = (
	user: User,
	workflowDependencyQueryService: WorkflowDependencyQueryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_dependency_counts',
	config: {
		description:
			'Get dependency counts for the specified resources. Returns counts of credentials, workflows, data tables, and error workflows that depend on or are depended on by each resource. Only resources the user has access to are included.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Dependency Counts',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ resourceIds, resourceType }: GetDependencyCountsParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_dependency_counts',
			parameters: { resourceIds, resourceType },
		};

		try {
			const payload: DependencyCountsBatchResponse =
				await workflowDependencyQueryService.getDependencyCounts(resourceIds, resourceType, user);

			telemetryPayload.results = {
				success: true,
				data: { count: Object.keys(payload).length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: { data: payload },
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }) }],
				isError: true,
			};
		}
	},
});
