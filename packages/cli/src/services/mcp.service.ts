import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb, User } from '@n8n/db';
import {
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Like } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

@Service()
export class McpService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
	) {}

	getServer(user: User) {
		const server = new McpServer(
			{
				name: 'MCP Control Server',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		server.registerTool(
			'get_workflow',
			{
				description: 'Get workflow by id',
				inputSchema: { workflowId: z.string() },
			},
			async ({ workflowId }) => {
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!workflow) {
					throw new OperationalError('Workflow not found');
				}
				return {
					content: [{ type: 'text', text: JSON.stringify(workflow) }],
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

				const [workflows, count] = await Container.get(WorkflowRepository).findAndCount({
					take: limit,
					where,
				});

				return {
					content: [{ type: 'text', text: JSON.stringify({ data: workflows, count }) }],
				};
			},
		);

		server.registerTool(
			'get_node_type',
			{
				description: 'Get a node type definition with all parameters',
				inputSchema: {
					nodeType: z.string().describe('Node type name (e.g. @n8n/n8n-nodes-langchain.agent)'),
				},
			},
			async ({ nodeType }) => {
				try {
					const nodeTypeDef = this.nodeTypes.getByName(nodeType);
					return {
						content: [{ type: 'text', text: JSON.stringify(nodeTypeDef) }],
					};
				} catch (error) {
					throw new OperationalError(`Node type not found: ${nodeType}`);
				}
			},
		);

		server.registerTool(
			'search_node_types',
			{
				description: 'Search available node types by name, alias or description',
				inputSchema: {
					query: z.string().optional().describe('Search query for name, alias or description'),
					limit: z.number().optional().describe('Limit the number of results'),
				},
			},
			async ({ query, limit = 100 }) => {
				const knownNodes = this.nodeTypes.getKnownTypes();
				const nodeNames = Object.keys(knownNodes);

				let filteredNodeNames = nodeNames;

				if (query) {
					const searchQuery = query.toLowerCase();
					filteredNodeNames = nodeNames.filter((nodeName) => {
						try {
							const nodeType = this.nodeTypes.getByName(nodeName);
							const nameMatch = nodeName.toLowerCase().includes(searchQuery);
							const displayNameMatch = nodeType.description?.displayName
								?.toLowerCase()
								.includes(searchQuery);
							const descriptionMatch = nodeType.description?.description
								?.toLowerCase()
								.includes(searchQuery);

							return nameMatch || displayNameMatch || descriptionMatch;
						} catch {
							// If we can't get the node type, just check the name
							return nodeName.toLowerCase().includes(searchQuery);
						}
					});
				}

				const limitedResults = filteredNodeNames.slice(0, limit);

				const nodeData = limitedResults.map((nodeName) => {
					try {
						const nodeType = this.nodeTypes.getByName(nodeName);

						return {
							name: nodeName,
							displayName: nodeType.description?.displayName,
							description: nodeType.description?.description,
							group: nodeType.description?.group,
						};
					} catch {
						return {
							name: nodeName,
							displayName: nodeName,
							description: 'Node type information not available',
							group: undefined,
							version: undefined,
							defaults: undefined,
						};
					}
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								data: nodeData,
								count: filteredNodeNames.length,
							}),
						},
					],
				};
			},
		);

		server.registerTool(
			'create_workflow',
			{
				description: 'Create a new workflow with nodes and connections',
				inputSchema: {
					name: z.string().describe('Workflow name'),
					nodes: z
						.array(
							z.object({
								id: z
									.string()
									.optional()
									.describe('Node ID - if not provided, a new ID will be generated'),
								name: z.string().describe('Node name'),
								type: z.string().describe("Node type (e.g. 'n8n-nodes-base.httpRequest')"),
								position: z.array(z.number()).length(2).describe('Node position [x, y]'),
								parameters: z.record(z.any()).optional().describe('Node parameters'),
								disabled: z.boolean().optional().describe('Whether the node is disabled'),
							}),
						)
						.optional()
						.describe('Nodes to include in the workflow'),
					connections: z.record(z.any()).optional().describe('Workflow connections object'),
					settings: z.record(z.any()).optional().describe('Workflow settings'),
					active: z.boolean().optional().describe('Whether the workflow should be active'),
					projectId: z.string().optional().describe('Project ID to create the workflow in'),
				},
			},
			async ({ name, nodes = [], connections = {}, settings = {}, active = false, projectId }) => {
				const workflowNodes =
					nodes.length > 0
						? nodes.map((node) => ({
								...node,
								id: node.id || uuid(),
								parameters: node.parameters || {},
								typeVersion: 1,
							}))
						: [
								{
									id: uuid(),
									name: 'Start',
									parameters: {},
									position: [240, 300],
									type: 'n8n-nodes-base.manualTrigger',
									typeVersion: 1,
								},
							];

				const workflowEntity = Container.get(WorkflowRepository).create({
					active: active ?? false,
					name,
					nodes: workflowNodes,
					connections: connections ?? {},
					versionId: uuid(),
					settings: settings ?? {},
					...(projectId && { projectId }),
				});

				const savedWorkflow = (await Container.get(WorkflowRepository).save(
					workflowEntity,
				)) as IWorkflowDb;
				const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
					user.id,
				);

				await Container.get(SharedWorkflowRepository).save(
					Container.get(SharedWorkflowRepository).create({
						role: 'workflow:owner',
						projectId: project.id,
						workflow: savedWorkflow,
					}),
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								success: true,
								workflow: savedWorkflow,
								message: 'Workflow created successfully',
							}),
						},
					],
				};
			},
		);

		server.registerTool(
			'update_workflow',
			{
				description: 'Update an existing workflow by adding, modifying, or removing nodes',
				inputSchema: {
					workflowId: z.string().describe('ID of the workflow to update'),
					nodes: z
						.array(
							z.object({
								id: z
									.string()
									.optional()
									.describe('Node ID - if not provided, a new ID will be generated'),
								name: z.string().describe('Node name'),
								type: z.string().describe("Node type (e.g. 'n8n-nodes-base.httpRequest')"),
								position: z.array(z.number()).length(2).describe('Node position [x, y]'),
								parameters: z.record(z.any()).optional().describe('Node parameters'),
								disabled: z.boolean().optional().describe('Whether the node is disabled'),
							}),
						)
						.optional()
						.describe('Nodes to add to the workflow'),
					connections: z.record(z.any()).optional().describe('Workflow connections object'),
					removeNodeIds: z
						.array(z.string())
						.optional()
						.describe('IDs of nodes to remove from the workflow'),
					settings: z.record(z.any()).optional().describe('Workflow settings to update'),
					versionId: z.string().optional().describe('Version ID for conflict detection'),
				},
			},
			async ({ workflowId, nodes, connections, removeNodeIds, settings, versionId }) => {
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);

				if (!workflow) {
					throw new OperationalError('Workflow not found or insufficient permissions');
				}

				const updatedWorkflow = new WorkflowEntity();
				Object.assign(updatedWorkflow, workflow);

				// Remove nodes if specified
				if (removeNodeIds?.length) {
					updatedWorkflow.nodes = updatedWorkflow.nodes.filter(
						(node) => !removeNodeIds.includes(node.id),
					);

					// Clean up connections for removed nodes
					if (updatedWorkflow.connections) {
						const cleanedConnections = { ...updatedWorkflow.connections };
						removeNodeIds.forEach((nodeId) => {
							delete cleanedConnections[nodeId];
						});

						// Remove connections TO removed nodes
						Object.keys(cleanedConnections).forEach((nodeId) => {
							const nodeConnections = cleanedConnections[nodeId];
							if (nodeConnections.main) {
								nodeConnections.main = nodeConnections.main.map(
									(connectionGroup) =>
										connectionGroup?.filter((conn) => !removeNodeIds.includes(conn.node)) || [],
								);
							}
						});

						updatedWorkflow.connections = cleanedConnections;
					}
				}

				// Add new nodes if specified
				if (nodes?.length) {
					const newNodes = nodes.map((node) => ({
						...node,
						id: node.id || uuid(),
						parameters: node.parameters || {},
						typeVersion: 1,
					}));
					// @ts-ignore
					updatedWorkflow.nodes = [...updatedWorkflow.nodes, ...newNodes];
				}

				// Update connections if specified
				if (connections) {
					updatedWorkflow.connections = {
						...updatedWorkflow.connections,
						...connections,
					};
				}

				// Update settings if specified
				if (settings) {
					updatedWorkflow.settings = {
						...updatedWorkflow.settings,
						...settings,
					};
				}

				// Set version ID if provided
				if (versionId) {
					updatedWorkflow.versionId = versionId;
				}

				const result = await this.workflowService.update(
					user,
					updatedWorkflow,
					workflowId,
					[],
					undefined,
					false,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								success: true,
								workflow: result,
								message: 'Workflow updated successfully',
							}),
						},
					],
				};
			},
		);

		return server;
	}
}
