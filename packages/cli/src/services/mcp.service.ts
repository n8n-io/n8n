import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type FindOptionsWhere, In, Like } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';
import z from 'zod';

import { UrlService } from './url.service';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

@Service()
export class McpService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly urlService: UrlService,
		private readonly credentialsService: CredentialsService,
	) {}

	getServer(user: User) {
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
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
					throw new OperationalError('Workflow not found');
				}

				const webhooks = workflow.nodes.filter(
					(node) => node.type === 'n8n-nodes-base.webhook' && node.disabled !== true,
				);

				// TODO: Refactor
				let triggerNotice =
					'This workflow does not have a trigger node that can be executed via MCP.';
				if (webhooks.length > 0) {
					triggerNotice = 'This workflow is triggered by the following webhook(s):\n\n';

					// TODO: Fix complexity
					// eslint-disable-next-line complexity
					const webhookPromises = webhooks.map(async (node, index) => {
						// TODO: Refactor
						// Extract credentials information so we can prove key names that are required
						let credentialsInfo: string | null = null;
						if (node.parameters.authentication) {
							const authType = node.parameters.authentication as string;
							// For basic auth, we already know that it requires a username and password
							if (authType === 'basicAuth') {
								credentialsInfo =
									'\n\t - This webhook requires basic authentication with a username and password that should be provided by the user.';
							} else if (authType === 'headerAuth') {
								// For header auth, get credential by id to get the expected header name
								const id = node.credentials?.httpHeaderAuth?.id;
								if (id) {
									// TODO: Fix these type castings (check correct type for credentials)
									const creds = await this.credentialsService.getOne(user, id, true);
									if (creds && 'data' in creds && (creds as any).data?.name) {
										credentialsInfo = `\n\t - This webhook requires a header with name "${(creds as any).data.name}" and a value that should be provided by the user.`;
									}
								}
							} else if (authType === 'jwtAuth') {
								// For JWT, check key type to compose credential information
								const id = node.credentials?.jwtAuth?.id;
								if (id) {
									const creds = await this.credentialsService.getOne(user, id, true);
									// Passphrase
									if (creds && 'data' in creds && (creds as any).data?.secret) {
										credentialsInfo =
											'\n\t - This webhook requires a JWT secret that should be provided by the user.';
									} else if (creds && 'data' in creds && (creds as any).data?.keyType) {
										// PEM keys
										credentialsInfo =
											'\n\t - This webhook requires a JWT private and public keys that should be provided by the user.';
									}
								}
							}
						}

						const responseMode = node.parameters.responseMode as string | undefined;
						let responseModeInfo =
							'Webhook is configured to respond immediately with the message "Workflow got started."';
						if (responseMode === 'responseNode') {
							responseModeInfo =
								'Webhook is configured to respond using "Respond to Webhook" node.';
						} else if (responseMode === 'lastNode') {
							// [undefined = firstEntryJSOn], allEntries, firstEntryBinary, noData
							const responseData = node.parameters.responseData as string | undefined;
							responseModeInfo =
								'Webhook is configured to respond when the last node is executed. ';
							switch (responseData) {
								case 'allEntries':
									responseModeInfo +=
										'Returns all the entries of the last node. Always returns an array.';
									break;
								case 'firstEntryBinary':
									responseModeInfo +=
										'Returns the binary data of the first entry of the last node. Always returns a binary file.';
									break;
								case 'noData':
									responseModeInfo += 'Returns without a body.';
									break;
								default:
									responseModeInfo +=
										'Returns the JSON data of the first entry of the last node. Always returns a JSON object.';
									break;
							}
						}

						return `
								<trigger ${index + 1}>
								\t - Node name: ${node.name}
								\t - Base URL: ${this.urlService.baseUrl}
								\t - PATH: ${workflow.active ? '/webhook/' : '/webhook-test/'}${node.parameters.path as string}
								\t - HTTP Method: ${(node.parameters.httpMethod as string) ?? 'GET'}
								\t - Response Mode: ${responseModeInfo}
								${
									credentialsInfo
										? `\t - Credentials: ${credentialsInfo}`
										: '\t - No credentials required for this webhook.'
								}
								</trigger ${index + 1}>`;
					});

					const webhookResults = await Promise.all(webhookPromises);
					triggerNotice += webhookResults.join('\n\n');
					triggerNotice += `${
						workflow.active
							? '\n- Workflow is active and accessible. n8n Webhooks nodes do not have information about required request payloads, if that cannot be determined from the workflow itself, ask the user to provide it.'
							: '\n- Workflow is not active, it can only be triggered after clicking "Listen for test	 event" button in the n8n editor.'
					}`;
				}

				// Remove sensitive information
				// TODO: Check what else should be removed
				workflow.pinData = undefined;
				workflow.nodes.forEach((node) => {
					node.credentials = undefined;
				});

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
		);

		return server;
	}
}
