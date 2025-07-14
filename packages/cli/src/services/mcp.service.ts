import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type FindOptionsWhere, In, Like } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';
import z from 'zod';

import { UrlService } from './url.service';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class McpService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly urlService: UrlService,
	) {}

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
			'get_workflow_info',
			{
				description: 'Get information about a specific workflow',
				inputSchema: { workflowId: z.string().describe('The ID of the workflow to retrieve') },
			},
			async ({ workflowId }) => {
				/*
				TODO: Check these cases:
					- [X] Non-active workflows
					- [X] Archived workflows
					- [X] Not available in MCP workflows
					- [X] Different HTTP methods
					- [ ] Request payloads
					- [ ] Webhooks with auth
					- [ ] With respond to webhook
					- [ ] Respond immediately
					- [ ] Respond when last node is executed
					- [X] Multiple webhooks
					- [X] Disabled webhooks
					- [ ] Other triggers
				*/
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
					throw new OperationalError('Workflow not found');
				}

				workflow.pinData = undefined; // Remove pinData to avoid sending sensitive information

				const webhooks = workflow.nodes.filter(
					(node) => node.type === 'n8n-nodes-base.webhook' && node.disabled !== true,
				);

				let triggerNotice = 'This workflow does not have a trigger node.';
				if (webhooks.length > 0) {
					triggerNotice = 'This workflow is triggered by the following webhook(s):\n\n';
					triggerNotice += webhooks
						.map(
							(node, index) =>
								`
						TRIGGER ${index + 1}:
						\t - Node name: ${node.name}
						\t - Base URL: ${this.urlService.baseUrl}
						\t - PATH: ${workflow.active ? '/webhook/' : '/webhook-test/'}${node.parameters.path as string}
						\t - HTTP Method: ${(node.parameters.httpMethod as string) ?? 'GET'}
						`,
						)
						.join('\n\n');
					triggerNotice += `${
						workflow.active
							? '- Workflow is active and accessible.'
							: '- Workflow is not active, it can only be triggered after clicking "Listen for test	 event" button in the n8n editor.'
					}`;
				}

				return {
					content: [
						{ type: 'text', text: JSON.stringify({ workflow, triggerInfo: triggerNotice }) },
					],
				};
			},
		);

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
					isArchived: false,
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
						notice:
							'To get more information about a workflow, use the `get_workflow_info` tool with the workflow ID.',
					}));
				return {
					content: [{ type: 'text', text: JSON.stringify({ data, count: data.length }) }],
				};
			},
		);

		return server;
	}
}
