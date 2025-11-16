import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
		const listPromptsResource = createListPromptsResource(user, this.dataStoreService);
		server.setResourceHandler(listPromptsResource.handler);

		const getPromptResource = createGetPromptResource(user, this.dataStoreService);
		server.setResourceHandler(getPromptResource.handler);

		// ========== PROMPT TOOL ==========
		const promptTool = createPromptTool(user, this.dataStoreService);
		server.registerTool(promptTool.name, promptTool.config, promptTool.handler);

		return server;
	}
}
