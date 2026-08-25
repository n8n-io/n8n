import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { CHAT_TRIGGER_PATH_SUFFIX } from 'n8n-workflow';

import { isChatOAuth2Enabled } from '@/constants/oauth2-triggers';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { triggerResourceGate } from '../resource-gate';
import {
	CHAT_TRIGGER_SCOPES,
	isOAuthProtectedChatTrigger,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

@Service()
export class ChatTriggerTestResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'chat-trigger-test';
	readonly scopes = CHAT_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getTestWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!isChatOAuth2Enabled()) {
			return undefined;
		}

		if (!pathname.startsWith(`/${this.config.endpoints.webhookTest}/`)) {
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.webhookTest.length + 1));

		// Chat shares the generic test-webhook prefix with every other test webhook, so rule the
		// rest out on the path alone before paying for any registration lookup.
		if (!path.endsWith(`/${CHAT_TRIGGER_PATH_SUFFIX}`)) {
			return undefined;
		}

		// The registration holds the workflow exactly as the editor is testing it (including
		// unsaved changes), so it is the source of truth here — not the DB draft. The `setup`
		// GET is the page the visitor loads and the only redirect target, so it is the leg the
		// resource names.
		const registration = await this.registrations.get(
			this.registrations.toKey({ httpMethod: 'GET', path }),
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

		if (!isOAuthProtectedChatTrigger(node, this.config.chatTrigger.disablePublicChat)) {
			return undefined;
		}

		// The bare page URL, with no `?method=` selector — see the production resolver.
		const resourceUrl = `${trimTrailingSlash(this.urlService.getTestWebhookBaseUrl())}/${this.config.endpoints.webhookTest}/${path}`;
		const audiences = [resourceUrl];
		return {
			// Path included, like the webhook resolver's id: one workflow can hold several chat
			// triggers, each its own resource.
			id: `workflow-chat:${workflowEntity.id}:${path}`,
			isFirstParty: true,
			getResourceUrl: () => resourceUrl,
			getAudiences: () => audiences,
			getAllowedRedirectUris: async () => [resourceUrl],
			scopes: CHAT_TRIGGER_SCOPES,
			displayName: workflowEntity.name,
			// No `executeAccessWorkflowId`: today any authenticated visitor may chat, and IAM-1263
			// owns the opt-in toggle. `uiHints` is IAM-1266's.
			...triggerResourceGate(this.workflowFinderService, { audiences }),
		};
	}
}
