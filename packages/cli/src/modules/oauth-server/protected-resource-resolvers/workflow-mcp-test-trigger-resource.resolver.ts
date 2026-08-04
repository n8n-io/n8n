import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import {
	WORKFLOW_MCP_TRIGGER_SCOPES,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';
import { User } from '@n8n/db';

@Service()
export class WorkflowMcpTestTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'workflow-mcp-test-trigger';
	readonly scopes = WORKFLOW_MCP_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getTestWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.mcpTest}/`)) {
			// we can quickly rule out non-MCP-test paths without doing any URL parsing, so check that first
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.mcpTest.length + 1));

		this.logger.debug(`Resolving workflow MCP test trigger resource for path: ${path}`);

		// The registration holds the workflow exactly as the editor is testing it
		// (including unsaved changes), so it is the source of truth here — not the
		// DB draft. Only the static key shape is looked up: dynamic registrations
		// are keyed differently and are not protectable resources.
		const registration = await this.registrations.get(
			this.registrations.toKey({ httpMethod: 'POST', path }),
		);

		if (!registration) {
			this.logger.debug(`No test webhook registration found for path: ${path}`);
			return undefined;
		}

		const { workflowEntity, webhook } = registration;

		const node = workflowEntity.nodes.find((n) => n.name === webhook.node);

		if (!node) {
			this.logger.debug(
				`No node found with name ${webhook.node} in test registration for workflow with ID: ${workflowEntity.id}`,
			);
			return undefined;
		}

		if (
			node.type === MCP_TRIGGER_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.mcpTest}/${path}`;
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				id: 'workflow-mcp-test:' + workflowEntity.id,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				scopes: WORKFLOW_MCP_TRIGGER_SCOPES,
				displayName: workflowEntity.name,
				authorize: async (user: User) => {
					if (requireExecute) {
						return (
							await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
								[workflowEntity.id],
								user,
								['workflow:execute'],
							)
						).has(workflowEntity.id);
					}
					return true;
				},
			};
		}

		this.logger.debug(
			`Node with name ${webhook.node} in test registration for workflow with ID: ${workflowEntity.id} is not an enabled MCP trigger with n8nOAuth2 authentication`,
		);
		return undefined;
	}
}
