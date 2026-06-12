import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WebhookService } from '@/webhooks/webhook.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WORKFLOW_MCP_TRIGGER_SCOPES, trimSlashes, trimTrailingSlash } from './utils';

@Service()
export class WorkflowMcpTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	readonly id = 'workflow-mcp-trigger';
	readonly scopes = WORKFLOW_MCP_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		let url: URL;
		try {
			url = new URL(resourceUrl);
		} catch {
			this.logger.debug(`Failed to parse resource URL: ${resourceUrl}`);
			return undefined;
		}
		if (url.origin !== new URL(this.urlService.getWebhookBaseUrl()).origin) {
			return undefined;
		}
		return await this.resolveByPath(url.pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.mcp}/`)) {
			// we can quickly rule out non-MCP paths without doing any URL parsing, so check that first
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.mcp.length + 1));

		this.logger.debug(`Resolving workflow MCP trigger resource for path: ${path}`);

		const webhook = await this.webhookService.findWebhook('POST', path);

		if (!webhook) {
			this.logger.debug(`No webhook found for path: ${path}`);
			return undefined;
		}

		if (webhook.isDynamic) {
			this.logger.debug(
				`Webhook for path ${path} is dynamic, skipping protected resource resolution`,
			);
			return undefined;
		}

		const { workflowId, node: nodeName } = webhook;

		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: {
				activeVersion: true,
			},
		});

		if (!workflow?.activeVersion) {
			this.logger.debug(`No active version found for workflow with ID: ${workflowId}`);
			return undefined;
		}

		const node = workflow.activeVersion.nodes.find((n) => n.name === nodeName);

		if (!node) {
			this.logger.debug(
				`No node found with name ${nodeName} in active version of workflow with ID: ${workflowId}`,
			);
			return undefined;
		}

		if (
			node.type === MCP_TRIGGER_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.mcp}/${path}`;
			return {
				id: 'workflow-mcp:' + workflow.id,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				scopes: WORKFLOW_MCP_TRIGGER_SCOPES,
				displayName: workflow.name,
			};
		}

		this.logger.debug(
			`Node with name ${nodeName} in active version of workflow with ID: ${workflowId} is not an enabled MCP trigger with n8nOAuth2 authentication`,
		);
		return undefined;
	}
}
