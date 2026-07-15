import type { DependencyResourceType, DependenciesBatchResponse } from '@n8n/api-types';
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
		.describe('Array of resource IDs to query dependencies for'),
	resourceType: z
		.enum(RESOURCE_TYPE_VALUES)
		.describe('The type of resources specified in resourceIds'),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.record(
			z.string(),
			z.object({
				dependencies: z
					.array(
						z.object({
							type: z
								.enum([
									'credentialId',
									'dataTableId',
									'errorWorkflow',
									'errorWorkflowParent',
									'workflowCall',
									'workflowParent',
								])
								.describe('The type of the dependency'),
							id: z.string().describe('The ID of the dependency (a resource ID)'),
							name: z.string().describe('The human-readable name of the dependency'),
							projectId: z
								.string()
								.optional()
								.describe(
									'Project ID for the dependency (included for data tables to build direct links)',
								),
						}),
					)
					.describe('List of resolved dependencies with names and types'),
				inaccessibleCount: z
					.number()
					.int()
					.min(0)
					.describe(
						'Number of dependencies on this resource that the user does not have permission to view',
					),
			}),
		)
		.describe(
			'Map of resource ID to resolved dependency details. Only resources the user has access to are included.',
		),
} satisfies z.ZodRawShape;

type GetDependenciesParams = {
	resourceIds: string[];
	resourceType: DependencyResourceType;
};

export const createGetDependenciesTool = (
	user: User,
	workflowDependencyQueryService: WorkflowDependencyQueryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_dependencies',
	config: {
		description:
			'Get resolved dependency details for the specified resources. Returns the names, types, and IDs of all dependencies (credentials, workflows, data tables, error workflows) that depend on or are depended on by each resource. Dependencies the user cannot access are counted in inaccessibleCount.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Dependencies',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ resourceIds, resourceType }: GetDependenciesParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_dependencies',
			parameters: { resourceIds, resourceType },
		};

		try {
			const payload: DependenciesBatchResponse =
				await workflowDependencyQueryService.getResourceDependencies(
					resourceIds,
					resourceType,
					user,
				);

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
