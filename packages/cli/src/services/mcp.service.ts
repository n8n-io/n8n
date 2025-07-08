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
			async ({ limit = 500, active, name, projectId }) => {
				const where: FindOptionsWhere<WorkflowEntity> = {
					...(active !== undefined && { active }),
					...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
				};

				let workflows = await this.workflowFinderService.findAllWorkflowsForUser(user, [
					'workflow:read',
				]);

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

				const [filteredWorkflows] = await Container.get(WorkflowRepository).findAndCount({
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
					content: [{ type: 'text', text: JSON.stringify({ data, count: data.length }) }],
				};
			},
		);

		return server;
	}
}
