import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GlobalConfig } from '@n8n/config';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { createListPromptsResource } from './resources/list-prompts.resource';
import { createGetPromptResource } from './resources/get-prompt.resource';
import { createPromptTool } from './tools/prompt.tool';
import { createWorkflowDetailsTool } from './tools/get-workflow-details.tool';
import { createSearchWorkflowsTool } from './tools/search-workflows.tool';

import { CredentialsService } from '@/credentials/credentials.service';
import { DataStoreService } from '@/modules/data-table/data-store.service';
import { ProjectService } from '@/services/project.service.ee';
import { UrlService } from '@/services/url.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

@Service()
export class McpService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
		private readonly urlService: UrlService,
		private readonly credentialsService: CredentialsService,
		private readonly globalConfig: GlobalConfig,
		private readonly dataStoreService: DataStoreService,
		private readonly projectService: ProjectService,
	) {}

	getServer(user: User) {
		const server = new McpServer({
			name: 'n8n MCP Server',
			version: '1.0.0',
		});

		// ========== WORKFLOW TOOLS ==========
		const workflowSearchTool = createSearchWorkflowsTool(user, this.workflowService);
		server.registerTool(
			workflowSearchTool.name,
			workflowSearchTool.config,
			workflowSearchTool.handler,
		);

		const workflowDetailsTool = createWorkflowDetailsTool(
			user,
			this.urlService.getWebhookBaseUrl(),
			this.workflowFinderService,
			this.credentialsService,
			{
				webhook: this.globalConfig.endpoints.webhook,
				webhookTest: this.globalConfig.endpoints.webhookTest,
			},
		);
		server.registerTool(
			workflowDetailsTool.name,
			workflowDetailsTool.config,
			workflowDetailsTool.handler,
		);

		// ========== PROMPT RESOURCES ==========
		const listPromptsResource = createListPromptsResource(
			user,
			this.dataStoreService,
			this.projectService,
		);
		const getPromptResource = createGetPromptResource(user, this.dataStoreService);

		// List all available resources
		server.setRequestHandler(ListResourcesRequestSchema, async () => {
			return {
				resources: [
					{
						uri: listPromptsResource.uri,
						name: listPromptsResource.config.name,
						description: listPromptsResource.config.description,
						mimeType: listPromptsResource.config.mimeType,
					},
				],
			};
		});

		// Read specific resource by URI
		server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
			const uri = request.params.uri;

			// Handle list prompts resource
			if (uri === 'prompts://list') {
				return await listPromptsResource.handler();
			}

			// Handle get prompt resource (matches prompts://projectId/promptName)
			if (uri.startsWith('prompts://') && uri !== 'prompts://list') {
				return await getPromptResource.handler({ uri });
			}

			throw new Error(`Resource not found: ${uri}`);
		});

		// ========== PROMPT TOOL ==========
		const promptTool = createPromptTool(user, this.dataStoreService);
		server.registerTool(promptTool.name, promptTool.config, promptTool.handler);

		return server;
	}
}
