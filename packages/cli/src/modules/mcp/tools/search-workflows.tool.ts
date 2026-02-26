import { type User, type WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type {
	ToolDefinition,
	SearchWorkflowsParams,
	SearchWorkflowsResult,
	SearchWorkflowsItem,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import { nodeSchema } from './schemas';

import type { ListQuery } from '@/requests';
import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';

const MAX_RESULTS = 200;

const inputSchema = {
	limit: z
		.number()
		.int()
		.positive()
		.max(MAX_RESULTS)
		.optional()
		.describe(`Limit the number of results (max ${MAX_RESULTS})`),
	query: z.string().optional().describe('Filter by name or description'),
	projectId: z.string().optional(),
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
					.describe('The ISO timestamp when the workflow was last updated'),
				triggerCount: z
					.number()
					.nullable()
					.describe('The number of triggers associated with the workflow'),
				nodes: z.array(nodeSchema).describe('List of nodes in the workflow'),
				scopes: z.array(z.string()).describe('User permissions for this workflow'),
				canExecute: z
					.boolean()
					.describe('Whether the user has permission to execute this workflow'),
			}),
		)
		.describe('List of workflows matching the query'),
	count: z.number().int().min(0).describe('Total number of workflows that match the filters'),
} satisfies z.ZodRawShape;

/**
 * 	Creates mcp tool definition for searching workflows with optional filters. Workflows can be filtered by name, active status, and project ID.
 * Returns a preview of each workflow including id, name, active status, creation and update timestamps, trigger count, and nodes.
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
		}: {
			limit?: number;
			query?: string;
			projectId?: string;
		}) => {
			const parameters = { limit, query, projectId };
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
	{ limit = MAX_RESULTS, query, projectId }: SearchWorkflowsParams,
): Promise<SearchWorkflowsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);

	const options: ListQuery.Options = {
		take: safeLimit,
		filter: {
			isArchived: false,
			availableInMCP: true,
			active: true,
			...(query ? { query } : {}),
			...(projectId ? { projectId } : {}),
		},
		select: {
			id: true,
			activeVersionId: true,
			name: true,
			description: true,
			active: true,
			createdAt: true,
			updatedAt: true,
			triggerCount: true,
			activeVersion: true,
			ownedBy: true, // Required for loading 'shared' relation used in scope computation
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
			activeVersion,
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
			nodes: (activeVersion?.nodes ?? []).map((node: INode) => ({
				name: node.name,
				type: node.type,
			})),
			scopes,
			canExecute: scopes.includes('workflow:execute'),
		};
	});

	return { data: formattedWorkflows, count };
}
