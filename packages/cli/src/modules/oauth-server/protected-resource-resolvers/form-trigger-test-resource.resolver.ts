import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import {
	FORM_TRIGGER_SCOPES,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

@Service()
export class FormTriggerTestResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'form-trigger-test';
	readonly scopes = FORM_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getTestWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.formTest}/`)) {
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.formTest.length + 1));

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
			node.type === FORM_TRIGGER_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const resourceUrl = `${trimTrailingSlash(this.urlService.getTestWebhookBaseUrl())}/${this.config.endpoints.formTest}/${path}`;
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				id: 'workflow-form:' + workflowEntity.id,
				isFirstParty: true,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				getAllowedRedirectUris: async () => [resourceUrl],
				scopes: FORM_TRIGGER_SCOPES,
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

		return undefined;
	}
}
