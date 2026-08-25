import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { CHAT_TRIGGER_PATH_SUFFIX } from 'n8n-workflow';

import { isChatOAuth2Enabled } from '@/constants/oauth2-triggers';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { WebhookService } from '@/webhooks/webhook.service';
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
export class ChatTriggerResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	readonly id = 'chat-trigger';
	readonly scopes = CHAT_TRIGGER_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl());
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

		if (!pathname.startsWith(`/${this.config.endpoints.webhook}/`)) {
			return undefined;
		}

		const path = trimSlashes(pathname.slice(this.config.endpoints.webhook.length + 1));

		// Chat shares the generic webhook prefix with every other webhook on the instance, so
		// rule the rest out on the path alone before paying for any cache or DB lookup.
		if (!path.endsWith(`/${CHAT_TRIGGER_PATH_SUFFIX}`)) {
			return undefined;
		}

		// The `setup` GET is the page the visitor loads and the only redirect target, so it is
		// the leg the resource names. Static-only: this path is reachable unauthenticated.
		const webhook = await this.webhookService.findStaticWebhook('GET', path);
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

		if (!isOAuthProtectedChatTrigger(node, this.config.chatTrigger.disablePublicChat)) {
			return undefined;
		}

		// The bare page URL, with no `?method=` selector: the path is derived from the node's own
		// `webhookId`, so no other node can register it, and the URL doubles as the `client_id`
		// and the single `redirect_uri` — it has to equal the page the visitor loads.
		const resourceUrl = `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}/${this.config.endpoints.webhook}/${path}`;
		const audiences = [resourceUrl];
		return {
			// Path included, like the webhook resolver's id: one workflow can hold several chat
			// triggers, each its own resource.
			id: `workflow-chat:${workflow.id}:${path}`,
			isFirstParty: true,
			getResourceUrl: () => resourceUrl,
			getAudiences: () => audiences,
			getAllowedRedirectUris: async () => [resourceUrl],
			scopes: CHAT_TRIGGER_SCOPES,
			displayName: workflow.name,
			// No `executeAccessWorkflowId`: today any authenticated visitor may chat, and IAM-1263
			// owns the opt-in toggle. `uiHints` is IAM-1266's.
			...triggerResourceGate(this.workflowFinderService, { audiences }),
		};
	}
}
