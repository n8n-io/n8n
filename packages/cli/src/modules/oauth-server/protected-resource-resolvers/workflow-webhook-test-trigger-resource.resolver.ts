import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import type {
	ProtectedResource,
	ProtectedResourceResolver,
} from '@/services/protected-resource.registry';

import { triggerResourceGate } from '../resource-gate';
import { UrlService } from '@/services/url.service';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import type { TestWebhookRegistration } from '@/webhooks/test-webhook-registrations.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	WEBHOOK_TRIGGER_SCOPES,
	methodQueryString,
	parseMethodParam,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
	webhookResourcePath,
} from './utils';

/**
 * Test-mode counterpart to {@link WorkflowWebhookTriggerResourceResolver}: resolves
 * `/webhook-test/*` paths, backed by {@link TestWebhookRegistrationsService} instead
 * of the DB. Mirrors how {@link WorkflowMcpTestTriggerResourceResolver} and
 * {@link FormTriggerTestResourceResolver} sit alongside their production resolvers.
 *
 * The registration holds the workflow exactly as the editor is testing it (including
 * unsaved changes), so `workflowEntity` is the source of truth here — there is no
 * "active version" to fall back to for a test webhook. Method-selector and dynamic-path
 * handling otherwise match the production resolver, since — unlike MCP/Form triggers —
 * a webhook trigger can listen on any HTTP method and on a dynamic path.
 */
@Service()
export class WorkflowWebhookTestTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly testWebhooks: TestWebhooks,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'workflow-webhook-test-trigger';
	readonly scopes = WEBHOOK_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getTestWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the test webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		// Can't throw — `resourceUrlToWebhookPath` already parsed the URL.
		return await this.resolveByPath(pathname, new URL(resourceUrl).search);
	}

	async resolveByPath(pathname: string, search?: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.webhookTest}/`)) {
			// we can quickly rule out non-test-webhook paths without doing any cache work
			return undefined;
		}

		// The method being served selects the trigger (see `methodQueryString`).
		const requestedMethod = parseMethodParam(new URLSearchParams(search).get('method'));

		const path = trimSlashes(pathname.slice(this.config.endpoints.webhookTest.length + 1));

		this.logger.debug(`Resolving workflow webhook test trigger resource for path: ${path}`);

		const registrations = await this.testWebhooks.getRegistrationsFromPath(path);

		if (registrations.length === 0) {
			this.logger.debug(`No test webhook registration found for path: ${path}`);
			return undefined;
		}

		// A test registration's key is `(httpMethod, path)`, mirroring the webhook
		// table's primary key in production: the requested method picks exactly one
		// registration. Without a method (a bare well-known probe) we can only answer
		// when the path hosts a single registration.
		const winner = requestedMethod
			? registrations.find((r) => r.webhook.httpMethod === requestedMethod)
			: registrations.length === 1
				? registrations[0]
				: undefined;

		if (!winner) {
			this.logger.debug(
				`No test webhook at path ${path} for method ${requestedMethod ?? '(unspecified)'}`,
			);
			return undefined;
		}

		// Every method of the *same* trigger becomes an accepted audience, so one token
		// spans a multi-method node — same rule as the production resolver.
		const triggerMethods = registrations
			.filter(
				(r) =>
					r.webhook.workflowId === winner.webhook.workflowId &&
					r.webhook.node === winner.webhook.node,
			)
			.map((r) => r.webhook.httpMethod);

		// `IWebhookData.path` omits the `webhookId` prefix for dynamic webhooks (see
		// `webhookResourcePath`), and is the templated path (placeholders intact) either
		// way, since `getActiveWebhookFromRegistration` returns the registration's own
		// stored webhook object unmodified regardless of the concrete request path.
		const resourcePath = webhookResourcePath(winner.webhook.path, winner.webhook.webhookId);

		return this.resolveWebhookNode(winner, resourcePath, winner.webhook.httpMethod, triggerMethods);
	}

	private resolveWebhookNode(
		{ workflowEntity, webhook }: TestWebhookRegistration,
		resourcePath: string,
		requestedMethod: string,
		triggerMethods: string[],
	): ProtectedResource | undefined {
		const node = workflowEntity.nodes.find((n) => n.name === webhook.node);

		if (!node) {
			this.logger.debug(
				`No node found with name ${webhook.node} in test registration for workflow with ID: ${workflowEntity.id}`,
			);
			return undefined;
		}

		if (
			node.type === WEBHOOK_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const baseUrl = `${trimTrailingSlash(this.urlService.getTestWebhookBaseUrl())}/${this.config.endpoints.webhookTest}/${resourcePath}`;
			const urlFor = (method: string) => `${baseUrl}${methodQueryString(method)}`;
			const methods = [...new Set(triggerMethods.map((method) => method.toUpperCase()))].sort();
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			// One list, served live and sealed into the grant, so the audiences a run is
			// verified against don't change when the registration goes away.
			const audiences = methods.map(urlFor);
			return {
				id: `workflow-webhook-test:${workflowEntity.id}:${resourcePath}`,
				getResourceUrl: () => urlFor(requestedMethod),
				getAudiences: () => audiences,
				scopes: WEBHOOK_TRIGGER_SCOPES,
				displayName: workflowEntity.name,
				...triggerResourceGate(this.workflowFinderService, {
					audiences,
					executeAccessWorkflowId: requireExecute ? workflowEntity.id : undefined,
				}),
			};
		}

		this.logger.debug(
			`Node with name ${webhook.node} in test registration for workflow with ID: ${workflowEntity.id} is not an enabled webhook trigger with n8nOAuth2 authentication`,
		);
		return undefined;
	}
}
