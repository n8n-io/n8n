import { type User, type WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import z from 'zod';

import type {
	ToolDefinition,
	SearchWorkflowsParams,
	SearchWorkflowsResult,
	SearchWorkflowsItem,
} from '../mcp.types';
import { nodeSchema } from './schemas';

import type { ListQuery } from '@/requests';
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
	active: z.boolean().optional().describe('Filter by active status'),
	name: z.string().optional().describe('Filter by name'),
	projectId: z.string().optional(),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string(),
				name: z.string().nullable(),
				active: z.boolean().nullable(),
				createdAt: z.string().nullable(),
				updatedAt: z.string().nullable(),
				triggerCount: z.number().nullable(),
				nodes: z.array(nodeSchema),
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
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'search_workflows',
		config: {
			description:
				'Search for workflows with optional filters. Returns a preview of each workflow.',
			inputSchema,
			outputSchema,
		},
		handler: async ({ limit = MAX_RESULTS, active, name, projectId }) => {
			const payload: SearchWorkflowsResult = await searchWorkflows(user, workflowService, {
				limit,
				active,
				name,
				projectId,
			});

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
		},
	};
};

export async function searchWorkflows(
	user: User,
	workflowService: WorkflowService,
	{ limit = MAX_RESULTS, active, name, projectId }: SearchWorkflowsParams,
): Promise<SearchWorkflowsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);

	const options: ListQuery.Options = {
		take: safeLimit,
		filter: {
			isArchived: false,
			availableInMCP: true,
			...(active !== undefined ? { active } : {}),
			...(name ? { name } : {}),
			...(projectId ? { projectId } : {}),
		},
		select: {
			id: true,
			name: true,
			active: true,
			createdAt: true,
			updatedAt: true,
			triggerCount: true,
			nodes: true,
		},
	};

	const { workflows, count } = await workflowService.getMany(
		user,
		options,
		false, // includeScopes
		false, // includeFolders
		false, // onlySharedWithMe
	);

	const formattedWorkflows: SearchWorkflowsItem[] = (workflows as WorkflowEntity[]).map(
		({ id, name, active, createdAt, updatedAt, triggerCount, nodes }) => ({
			id,
			name,
			active,
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
			triggerCount,
			nodes: (nodes ?? []).map((node: INode) => ({ name: node.name, type: node.type })),
		}),
	);

	return { data: formattedWorkflows, count };
}
