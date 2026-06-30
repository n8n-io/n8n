import { type User, type WorkflowEntity } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { SEARCH_WORKFLOWS_SORT_BY_VALUES } from '../mcp.types';
import type {
	ToolDefinition,
	SearchWorkflowsParams,
	SearchWorkflowsResult,
	SearchWorkflowsItem,
	SearchWorkflowsSortBy,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';

import type { ListQuery } from '@/requests';
import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';
import { createLimitSchema, tagSchema, toTagSummary } from './schemas';

const MAX_RESULTS = 200;

const DEFAULT_SORT_BY: SearchWorkflowsSortBy = 'updatedAt:desc';

const inputSchema = {
	limit: createLimitSchema(MAX_RESULTS),
	query: z.string().optional().describe('Filter by name or description'),
	projectId: z.string().optional(),
	tags: z
		.array(z.string())
		.optional()
		.describe('Filter by tag names (AND semantics — workflow must have all).'),
	sortBy: z
		.enum(SEARCH_WORKFLOWS_SORT_BY_VALUES)
		.optional()
		.describe(
			`Sort order for results (default: ${DEFAULT_SORT_BY}). Use updatedAt:desc to find the most recently edited workflows first.`,
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the workflow'),
				name: z.string().nullable().describe('The name of the workflow'),
				description: z.string().nullable().optional().describe('The description of the workflow'),
				active: z.boolean().nullable().describe('Whether the workflow is active'),
				createdAt: z
					.string()
					.nullable()
					.describe('The ISO timestamp when the workflow was created'),
				updatedAt: z
					.string()
					.nullable()
					.describe(
						'ISO timestamp the workflow definition was last saved. Use this to identify recently edited workflows.',
					),
				triggerCount: z
					.number()
					.nullable()
					.describe('The number of triggers associated with the workflow'),
				scopes: z.array(z.string()).describe('User permissions for this workflow'),
				canExecute: z
					.boolean()
					.describe('Whether the user has permission to execute this workflow'),
				availableInMCP: z.boolean().describe('Whether the workflow is visible to MCP tools'),
				tags: z.array(tagSchema).describe('Tags assigned to the workflow'),
			}),
		)
		.describe('List of workflows matching the query'),
	count: z.number().int().min(0).describe('Total number of workflows that match the filters'),
} satisfies z.ZodRawShape;

/**
 * 	Creates mcp tool definition for searching workflows with optional filters. Workflows can be filtered by name, project ID, and tags.
 * Returns a preview of each workflow including id, name, active status, creation and update timestamps, trigger count, and tags.
 */
export const createSearchWorkflowsTool = (
	user: User,
	workflowService: WorkflowService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'search_workflows',
		config: {
			description:
				'Search for workflows with optional filters. Returns a preview of each workflow.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Search Workflows',
				readOnlyHint: true, // This tool only reads data
				destructiveHint: false, // No destructive operations
				idempotentHint: true, // Safe to retry multiple times
				openWorldHint: false, // Works with internal n8n data only
			},
		},
		handler: async ({
			limit = MAX_RESULTS,
			query,
			projectId,
			tags,
			sortBy,
		}: SearchWorkflowsParams) => {
			const parameters = { limit, query, projectId, tags, sortBy };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'search_workflows',
				parameters,
			};

			try {
				const payload: SearchWorkflowsResult = await searchWorkflows(user, workflowService, {
					limit,
					query,
					projectId,
					tags,
					sortBy,
				});

				// Track successful execution
				telemetryPayload.results = {
					success: true,
					data: {
						count: payload.count,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					structuredContent: payload,
					// Keeping text content for compatibility with mcp clients that don's support structuredContent
					content: [
						{
							type: 'text',
							text: JSON.stringify(payload),
						},
					],
				};
			} catch (error) {
				// Track failed execution
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

export async function searchWorkflows(
	user: User,
	workflowService: WorkflowService,
	{ limit = MAX_RESULTS, query, projectId, tags, sortBy = DEFAULT_SORT_BY }: SearchWorkflowsParams,
): Promise<SearchWorkflowsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
	const filterTags = tags && Array.from(new Set(tags.filter((tag) => tag.length > 0)));

	const options: ListQuery.Options = {
		take: safeLimit,
		sortBy,
		filter: {
			isArchived: false,
			...(query ? { query } : {}),
			...(projectId ? { projectId } : {}),
			...(filterTags && filterTags.length > 0 ? { tags: filterTags } : {}),
		},
		select: {
			id: true,
			activeVersionId: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			triggerCount: true,
			ownedBy: true, // Required for loading 'shared' relation used in scope computation
			settings: true,
			tags: true,
		},
	};

	const { workflows, count } = await workflowService.getMany(
		user,
		options,
		true, // includeScopes
		false, // includeFolders
		false, // onlySharedWithMe
	);

	const formattedWorkflows: SearchWorkflowsItem[] = workflows.map((workflow) => {
		const {
			id,
			name,
			description,
			activeVersionId,
			createdAt,
			updatedAt,
			triggerCount,
			settings,
			tags: workflowTags,
		} = workflow as WorkflowEntity;
		const scopes = ('scopes' in workflow ? (workflow.scopes as string[]) : undefined) ?? [];

		return {
			id,
			name,
			description,
			active: activeVersionId !== null,
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
			triggerCount,
			scopes,
			canExecute: scopes.includes('workflow:execute'),
			availableInMCP: settings?.availableInMCP ?? false,
			tags: toTagSummary(workflowTags),
		};
	});

	return { data: formattedWorkflows, count };
}
