import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	WORKFLOW_MCP_TRIGGER_SCOPES,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

@Service()
export class WorkflowMcpTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'workflow-mcp-trigger';
	readonly scopes = WORKFLOW_MCP_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.mcp}/`)) {
			// we can quickly rule out non-MCP paths without doing any URL parsing, so check that first
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.mcp.length + 1));

		this.logger.debug(`Resolving workflow MCP trigger resource for path: ${path}`);

		// Static-only lookup: this resolver never owns dynamic webhooks, so we avoid
		// the extra dynamic-webhook DB probe that `findWebhook` does on a static miss
		// — this path is reachable unauthenticated via the well-known route.
		const webhook = await this.webhookService.findStaticWebhook('POST', path);

		if (!webhook) {
			this.logger.debug(`No webhook found for path: ${path}`);
			return undefined;
		}

		if (webhook.isDynamic) {
			// A request path that literally matches a dynamic webhook's template
			// (e.g. `:param`) can still be returned by the static lookup; reject it.
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
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				id: 'workflow-mcp:' + workflow.id,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				scopes: WORKFLOW_MCP_TRIGGER_SCOPES,
				displayName: workflow.name,
				authorize: async (user: User) => {
					if (requireExecute) {
						return (
							await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
								[workflow.id],
								user,
								['workflow:execute'],
							)
						).has(workflow.id);
					}
					return true;
				},
			};
		}

		this.logger.debug(
			`Node with name ${nodeName} in active version of workflow with ID: ${workflowId} is not an enabled MCP trigger with n8nOAuth2 authentication`,
		);
		return undefined;
	}
}
