import { type User, type WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import z from 'zod';

import type { ToolDefinition } from '../mcp.types';

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
		},
		handler: async ({ limit = MAX_RESULTS, active, name, projectId }) => {
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

			const formattedWorkflows = (workflows as WorkflowEntity[]).map(
				({ id, name, active, createdAt, updatedAt, triggerCount, nodes }) => ({
					id,
					name,
					active,
					createdAt,
					updatedAt,
					triggerCount,
					nodes: (nodes ?? []).map((node: INode) => ({ name: node.name, type: node.type })),
				}),
			);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							data: formattedWorkflows,
							count,
						}),
					},
				],
			};
		},
	};
};
