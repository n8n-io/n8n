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
	canonicalMethodSet,
	isWebhookOAuth2Enabled,
	methodsQueryString,
	parseMethodsParam,
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
 * therefore cannot name the resource. We encode the trigger's full method-set
 * into the resource identity as `?methods=…`, which makes each trigger's `aud`
 * distinct (case above) while a single multi-method trigger keeps one shared
 * `aud` across its methods. Because `(path, method)` is unique, two triggers on a
 * path always have disjoint — hence unequal — method-sets, so the method-set is a
 * unique key among the triggers sharing a path.
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

		// The `methods` disambiguator rides in the query string (see `methodsQueryString`);
		// split it off before the `/{endpoint}/…` path check and slug extraction.
		const [rawPath, queryString] = pathname.split('?');
		const requestedMethods = parseMethodsParam(new URLSearchParams(queryString).get('methods'));

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

		// Group rows back into their triggers, collecting each trigger's method-set and
		// its canonical resource path — the templated `uniquePath` for dynamic webhooks
		// (placeholders intact, concrete values discarded), so all instances of one
		// trigger share a single `aud`. A node listening on several methods registers
		// one row per method, all sharing the same (workflow, node) — collapse those so
		// a multi-method trigger counts as the single trigger it is.
		const triggers = new Map<
			string,
			{ workflowId: string; node: string; resourcePath: string; methods: Set<string> }
		>();
		for (const webhook of webhooks) {
			const key = `${webhook.workflowId}::${webhook.node}`;
			const trigger = triggers.get(key) ?? {
				workflowId: webhook.workflowId,
				node: webhook.node,
				resourcePath: webhook.uniquePath,
				methods: new Set<string>(),
			};
			trigger.methods.add(webhook.method);
			triggers.set(key, trigger);
		}

		// Resolve each trigger to its resource, keyed by its canonical method-set so
		// the requested set can pick exactly one (sets are disjoint across triggers).
		const resolvedByMethodSet = new Map<string, ProtectedResource>();
		for (const { workflowId, node, resourcePath, methods } of triggers.values()) {
			const methodSet = canonicalMethodSet(methods);
			const resource = await this.resolveWebhookNode(workflowId, node, resourcePath, methodSet);
			if (resource) resolvedByMethodSet.set(methodSet.join(','), resource);
		}

		if (resolvedByMethodSet.size === 0) return undefined;

		// A caller that knows the method-set (arrived via a `?methods=…` challenge)
		// pins the exact trigger; a non-matching set resolves to nothing (fail closed).
		if (requestedMethods) {
			return resolvedByMethodSet.get(requestedMethods.join(','));
		}

		// No method-set given (e.g. a bare well-known probe): a resource must still map
		// to exactly one trigger, otherwise its `aud` would be ambiguous. When several
		// triggers share the path we refuse rather than pick a winner — the caller can
		// disambiguate by repeating the request with `?methods=…`.
		if (resolvedByMethodSet.size !== 1) {
			this.logger.warn(
				`Path ${path} maps to ${resolvedByMethodSet.size} OAuth webhook triggers; refusing to expose an ambiguous protected resource without a methods disambiguator`,
			);
			return undefined;
		}

		return [...resolvedByMethodSet.values()][0];
	}

	private async resolveWebhookNode(
		workflowId: string,
		nodeName: string,
		resourcePath: string,
		methodSet: string[],
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
			// Identity = resource path + the trigger's method-set. The path alone can be
			// shared by disjoint-method triggers, so the `?methods=…` suffix keeps each
			// `aud` distinct; a single multi-method trigger keeps one `aud` across its
			// methods. For dynamic webhooks the path is the template (placeholders intact),
			// so one `aud` covers every concrete instance of the trigger.
			const methodsQuery = methodsQueryString(methodSet);
			const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.webhook}/${resourcePath}${methodsQuery}`;
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				// Include the path and method-set: unlike an MCP trigger, a workflow can
				// hold several webhook nodes, each its own resource with a distinct `aud`.
				id: `workflow-webhook:${workflow.id}:${resourcePath}${methodsQuery}`,
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
