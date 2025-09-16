import { type User, type WorkflowEntity } from '@n8n/db';
import z from 'zod';

import type { ListQuery } from '@/requests';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { ToolDefinition } from '../types';

const inputSchema = {
	limit: z.number().optional().describe('Limit the number of results'),
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
			description: 'Search for workflows with optional filters',
			inputSchema,
		},
		handler: async ({ limit = 500, active, name, projectId }) => {
			const options: ListQuery.Options = {
				take: limit,
				filter: {
					isArchived: false,
					availableInMCP: true,
					...(active !== undefined ? { active } : {}),
					...(name ? { name } : {}),
					...(projectId ? { projectId } : {}),
				},
				// Select a safe subset for preview purposes
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
				({ id, name, active, createdAt, updatedAt, triggerCount, nodes, connections }) => ({
					id,
					name,
					active,
					createdAt,
					updatedAt,
					triggerCount,
					nodes: (nodes ?? []).map((node: any) => ({ name: node.name, type: node.type })),
					connections,
				}),
			);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							data: {
								notice:
									'Workflow data here is not complete. To get more information about a specific workflow, use the `get_workflow_info` tool with the workflow ID.',
								results: formattedWorkflows,
							},
							count,
						}),
					},
				],
			};
		},
	};
};
