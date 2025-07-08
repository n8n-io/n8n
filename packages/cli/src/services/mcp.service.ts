import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type FindOptionsWhere, In, Like } from '@n8n/typeorm';
import z from 'zod';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class McpService {
	constructor(private readonly workflowFinderService: WorkflowFinderService) {}

	getServer(user: User) {
		console.log('Creating MCP server for user:', user.id, user.role);
		const server = new McpServer(
			{
				name: 'n8n MCP Server',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		// TODO: Extract tools to separate files
		server.registerTool(
			'search_workflows',
			{
				description: 'Search for workflows with optional filters',
				inputSchema: {
					limit: z.number().optional().describe('Limit the number of results'),
					active: z.boolean().optional().describe('Filter by active status'),
					name: z.string().optional().describe('Filter by name'),
					projectId: z.string().optional(),
				},
			},
			async ({ limit = 100, active, name, projectId }) => {
				const where: FindOptionsWhere<WorkflowEntity> = {
					...(active !== undefined && { active }),
					...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
				};

				if (['global:owner', 'global:admin'].includes(user.role)) {
					if (projectId) {
						const workflows = await this.workflowFinderService.findAllWorkflowsForUser(user, [
							'workflow:read',
						]);

						const workflowIds = workflows
							.filter((workflow) => workflow.projectId === projectId)
							.map((workflow) => workflow.id);

						where.id = In(workflowIds);
					}
				} else {
					const options: { workflowIds?: string[] } = {};

					let workflows = await this.workflowFinderService.findAllWorkflowsForUser(user, [
						'workflow:read',
					]);

					if (options.workflowIds) {
						const workflowIds = options.workflowIds;
						workflows = workflows.filter((wf) => workflowIds.includes(wf.id));
					}

					if (projectId) {
						workflows = workflows.filter((w) => w.projectId === projectId);
					}

					if (!workflows.length) {
						return {
							content: [{ type: 'text', text: JSON.stringify({ data: [], count: 0 }) }],
						};
					}

					const workflowsIds = workflows.map((wf) => wf.id);
					where.id = In(workflowsIds);
				}

				const [workflows] = await Container.get(WorkflowRepository).findAndCount({
					take: limit,
					where,
				});

				// TODO: Filter needs to be in where clause
				const data = workflows
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
					content: [{ type: 'text', text: JSON.stringify({ data, count: data.length }) }],
				};
			},
		);

		return server;
	}
}
