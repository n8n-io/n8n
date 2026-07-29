import type {
	ProtectedResource,
	ProtectedResourceResolver,
} from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import {
	WEBHOOK_TRIGGER_SCOPES,
	isWebhookOAuth2Enabled,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

/**
 * Resolves each OAuth-protected `/webhook/*` path to its own protected resource,
 * so a token minted for one webhook trigger is scoped (via its `aud`) to exactly
 * that trigger and cannot be replayed against another. Mirrors
 * {@link WorkflowMcpTriggerResourceResolver}; unlike MCP (always POST), a generic
 * webhook can listen on any HTTP method, so lookup is by path across all methods.
 */
@Service()
export class WorkflowWebhookTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'workflow-webhook-trigger';
	readonly scopes = WEBHOOK_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!isWebhookOAuth2Enabled()) {
			return undefined;
		}

		if (!pathname.startsWith(`/${this.config.endpoints.webhook}/`)) {
			// we can quickly rule out non-webhook paths without doing any DB work, so check that first
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.webhook.length + 1));

		this.logger.debug(`Resolving workflow webhook trigger resource for path: ${path}`);

		// A resource is identified only by its path — the RFC 8707 resource URL
		// carries no HTTP method — so consider every static webhook registered at
		// this path (a node listening on multiple methods registers one row per
		// method). Static-only: dynamic webhooks are never protectable resources.
		const webhooks = await this.webhookService.findStaticWebhooksByPath(path);

		if (webhooks.length === 0) {
			this.logger.debug(`No webhook found for path: ${path}`);
			return undefined;
		}

		// A node listening on several methods (`multipleMethods`) registers one row
		// per method, all sharing the same (workflow, node) — collapse those so a
		// multi-method trigger counts as the single trigger it is.
		const candidates = new Map<string, { workflowId: string; node: string }>();
		for (const webhook of webhooks) {
			if (webhook.isDynamic) continue;
			candidates.set(`${webhook.workflowId}::${webhook.node}`, {
				workflowId: webhook.workflowId,
				node: webhook.node,
			});
		}

		const resolved: ProtectedResource[] = [];
		for (const { workflowId, node } of candidates.values()) {
			const resource = await this.resolveWebhookNode(workflowId, node, path);
			if (resource) resolved.push(resource);
		}

		// A protected resource must map to exactly one trigger: its `aud` is derived
		// from the path alone (no method), so one token would be accepted at every
		// trigger sharing this path. n8n only enforces path uniqueness per
		// (path, method), so distinct triggers can still share a path via disjoint
		// methods — an ambiguous case we refuse to expose rather than pick a winner.
		if (resolved.length !== 1) {
			if (resolved.length > 1) {
				this.logger.warn(
					`Path ${path} maps to ${resolved.length} OAuth webhook triggers; refusing to expose an ambiguous protected resource`,
				);
			}
			return undefined;
		}

		return resolved[0];
	}

	private async resolveWebhookNode(
		workflowId: string,
		nodeName: string,
		path: string,
	): Promise<ProtectedResource | undefined> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true },
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
			node.type === WEBHOOK_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.webhook}/${path}`;
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				// Include the path: unlike an MCP trigger, a workflow can hold several
				// webhook nodes, each its own resource with a distinct `aud`.
				id: `workflow-webhook:${workflow.id}:${path}`,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				scopes: WEBHOOK_TRIGGER_SCOPES,
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
			`Node with name ${nodeName} in active version of workflow with ID: ${workflowId} is not an enabled webhook trigger with n8nOAuth2 authentication`,
		);
		return undefined;
	}
}
