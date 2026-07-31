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
	methodQueryString,
	parseMethodParam,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

/**
 * Resolves each OAuth-protected `/webhook/*` path to its own protected resource,
 * so a token minted for one webhook trigger is scoped (via its `aud`) to exactly
 * that trigger and cannot be replayed against another. Mirrors
 * {@link WorkflowMcpTriggerResourceResolver}; unlike MCP (always POST), a generic
 * webhook can listen on any HTTP method.
 *
 * A resource is identified by the trigger — `(workflowId, node)` — not by
 * `(path, method)`. n8n only enforces webhook uniqueness per `(path, method)`, so
 * one path can host several triggers as long as their methods are disjoint
 * (e.g. workflow A on `GET /orders`, workflow B on `POST /orders`). Path alone
 * therefore cannot name the resource, so a resource URL carries the method being
 * served as `?method=…`.
 *
 * The method is a *selector*, not part of the identity: because `(webhookPath,
 * method)` is the webhook table's primary key, one method picks exactly one row —
 * hence exactly one trigger — with no ambiguity to resolve. The trigger it picks
 * then accepts a token minted for *any* of its own methods (`getAudiences()`), so
 * one token spans a multi-method node and stays valid when the node gains another
 * method. That is also why `id` omits the method: consent is per trigger and must
 * survive an edit to its method list.
 *
 * Dynamic webhooks (`<webhookId>/user/:id`) resolve to their templated path as the
 * canonical identity, so one token covers every concrete instance (`/user/42`,
 * `/user/99`) — all the same node — while staying scoped to that trigger (the
 * `webhookId` prefix keeps distinct triggers apart). A concrete request path is
 * matched to its template with the same matcher the router uses, so the resolved
 * resource is always the trigger that would actually fire.
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
		// `preserveQuery`: unlike the sibling resolvers, we need the `?method=` selector.
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl(), {
			preserveQuery: true,
		});
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

		// The `?method=` selector rides in the query string (see `methodQueryString`);
		// split it off before the `/{endpoint}/…` path check and slug extraction.
		const [rawPath, queryString] = pathname.split('?');
		const requestedMethod = parseMethodParam(new URLSearchParams(queryString).get('method'));

		if (!rawPath.startsWith(`/${this.config.endpoints.webhook}/`)) {
			// we can quickly rule out non-webhook paths without doing any DB work, so check that first
			return undefined;
		}

		const path = trimSlashes(rawPath.slice(this.config.endpoints.webhook.length + 1));

		this.logger.debug(`Resolving workflow webhook trigger resource for path: ${path}`);

		// Consider every static webhook registered at this path; if none, fall back to
		// dynamic webhooks whose templated path matches (e.g. `<uuid>/user/:id`), so
		// both `/user/:id` and a concrete `/user/42` resolve to the same trigger. A
		// node listening on several methods registers one row per method.
		const staticWebhooks = await this.webhookService.findStaticWebhooksByPath(path);
		const webhooks =
			staticWebhooks.length > 0
				? staticWebhooks
				: await this.webhookService.findDynamicWebhooksByPath(path);

		if (webhooks.length === 0) {
			this.logger.debug(`No webhook found for path: ${path}`);
			return undefined;
		}

		// `(webhookPath, method)` is the webhook primary key, so the requested method
		// picks exactly one row — and therefore exactly one trigger. Without a method
		// (a bare well-known probe) we can only answer when the path hosts a single row.
		const row = requestedMethod
			? webhooks.find((webhook) => webhook.method === requestedMethod)
			: webhooks.length === 1
				? webhooks[0]
				: undefined;

		if (!row) {
			this.logger.debug(
				`No webhook at path ${path} for method ${requestedMethod ?? '(unspecified)'}`,
			);
			return undefined;
		}

		// Every method of the *same* trigger becomes an accepted audience, so one token
		// spans a multi-method node. A node listening on several methods registers one
		// row per method, all sharing the same (workflow, node).
		const triggerMethods = webhooks
			.filter((webhook) => webhook.workflowId === row.workflowId && webhook.node === row.node)
			.map((webhook) => webhook.method);

		// The resource path is the templated `uniquePath` for dynamic webhooks
		// (placeholders intact, concrete values discarded), so every instance of one
		// trigger shares a single identity.
		return await this.resolveWebhookNode(
			row.workflowId,
			row.node,
			row.uniquePath,
			row.method,
			triggerMethods,
		);
	}

	private async resolveWebhookNode(
		workflowId: string,
		nodeName: string,
		resourcePath: string,
		requestedMethod: string,
		triggerMethods: string[],
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
			const baseUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.webhook}/${resourcePath}`;
			const urlFor = (method: string) => `${baseUrl}${methodQueryString(method)}`;
			const methods = [...new Set(triggerMethods.map((method) => method.toUpperCase()))].sort();
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				// Identity = the trigger, so the method is deliberately absent: editing the
				// node's method list must not rotate the id and drop the user's consent.
				// The path is included because — unlike an MCP trigger — a workflow can hold
				// several webhook nodes, each its own resource.
				id: `workflow-webhook:${workflow.id}:${resourcePath}`,
				// Canonical URL = the method being resolved, so the metadata document served
				// at `?method=POST` advertises `?method=POST` back (RFC 9728 §3.1).
				getResourceUrl: () => urlFor(requestedMethod),
				// A token minted for any of this trigger's methods is accepted at all of
				// them; cross-trigger replay stays impossible because the list is built
				// only from rows sharing this (workflowId, node).
				getAudiences: () => methods.map(urlFor),
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
