import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import {
	FORM_TRIGGER_SCOPES,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

@Service()
export class FormTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'form-trigger';
	readonly scopes = FORM_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(`/${this.config.endpoints.form}/`)) {
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.form.length + 1));

		const webhook = await this.webhookService.findStaticWebhook('POST', path);
		if (!webhook || webhook.isDynamic) {
			return undefined;
		}

		const { workflowId, node: nodeName } = webhook;

		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true },
		});
		if (!workflow?.activeVersion) {
			return undefined;
		}

		const node = workflow.activeVersion.nodes.find((n) => n.name === nodeName);
		if (!node) {
			return undefined;
		}

		if (
			node.type === FORM_TRIGGER_NODE_TYPE &&
			!node.disabled &&
			node.parameters.authentication === 'n8nOAuth2'
		) {
			const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.form}/${path}`;
			const requireExecute = node.parameters.requireExecuteAccess !== false;
			return {
				id: 'workflow-form:' + workflow.id,
				isFirstParty: true,
				getResourceUrl: () => resourceUrl,
				getAudiences: () => [resourceUrl],
				getAllowedRedirectUris: async () => [resourceUrl],
				scopes: FORM_TRIGGER_SCOPES,
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

		return undefined;
	}
}
