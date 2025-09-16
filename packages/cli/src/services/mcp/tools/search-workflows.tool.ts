import {
	type User,
	type WorkflowEntity,
	type WorkflowRepository,
	type FindOptionsWhere,
	In,
	Like,
} from '@n8n/db';
import z from 'zod';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ToolDefinition } from '../types';

const inputSchema = {
	limit: z.number().optional().describe('Limit the number of results'),
	active: z.boolean().optional().describe('Filter by active status'),
	name: z.string().optional().describe('Filter by name'),
	projectId: z.string().optional(),
} satisfies z.ZodRawShape;

export const createSearchWorkflowsTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowRepository: WorkflowRepository,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'search_workflows',
		config: {
			description: 'Search for workflows with optional filters',
			inputSchema,
		},
		handler: async ({ limit = 500, active, name, projectId }) => {
			const where: FindOptionsWhere<WorkflowEntity> = {
				isArchived: false,
				...(active !== undefined && { active }),
				...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
			};

			let workflows = await workflowFinderService.findAllWorkflowsForUser(user, ['workflow:read']);

			if (projectId) {
				workflows = workflows.filter((w) => w.projectId === projectId);
			}

			if (!workflows.length) {
				return {
					content: [{ type: 'text', text: JSON.stringify({ data: [], count: 0 }) }],
				};
			}

			const workflowIds = workflows.map((wf) => wf.id);
			where.id = In(workflowIds);

			const [filteredWorkflows] = await workflowRepository.findAndCount({
				take: limit,
				where,
			});

			const data = filteredWorkflows
				.filter((w) => w.settings?.availableInMCP)
				.map(({ id, name, active, createdAt, updatedAt, triggerCount, nodes, connections }) => ({
					id,
					name,
					active,
					createdAt,
					updatedAt,
					triggerCount,
					nodes: nodes.map((node) => ({
						name: node.name,
						type: node.type,
					})),
					connections,
				}));
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							data: {
								notice:
									'Workflow data here is not complete. To get more information about a specific workflow, use the `get_workflow_info` tool with the workflow ID.',
								results: data,
							},
							count: data.length,
						}),
					},
				],
			};
		},
	};
};
