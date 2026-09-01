import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { INode } from 'n8n-workflow';
import { CHAT_TRIGGER_PATH_SUFFIX } from 'n8n-workflow';

import { isChatOAuth2Enabled } from '@/constants/oauth2-triggers';
import type {
	ProtectedResource,
	ProtectedResourceResolver,
} from '@/services/protected-resource.registry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { triggerResourceGate } from '../resource-gate';
import {
	CHAT_TRIGGER_CONSENT_HINTS,
	CHAT_TRIGGER_SCOPES,
	isOAuthProtectedChatTrigger,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from './utils';

/** The trigger a chat path resolves to, however the subclass found it. */
export interface ChatTriggerLookupResult {
	node: INode;
	workflowId: string;
	workflowName: string;
}

/**
 * Everything a chat trigger's protected-resource resolution does bar the lookup: the
 * feature gate, the path guards, the node gate, and the descriptor. The production and
 * test resolvers differ only in which endpoint and base URL they serve, and in how they
 * find the trigger — one reads the published workflow behind a registered webhook row,
 * the other the workflow the editor is currently testing.
 *
 * Shared as a base class so the two resources can't drift, for the same reason
 * {@link isOAuthProtectedChatTrigger} is shared: a difference between the production and
 * test gates would be a security difference.
 */
export abstract class ChatTriggerResourceResolverBase implements ProtectedResourceResolver {
	abstract readonly id: string;

	readonly scopes = CHAT_TRIGGER_SCOPES;

	// Supplied by each subclass as constructor parameter properties, so DI stays on the
	// concrete class and this base needs no constructor of its own.
	protected abstract readonly config: GlobalConfig;
	protected abstract readonly logger: Logger;
	protected abstract readonly workflowFinderService: WorkflowFinderService;

	/** `endpoints.webhook` or `endpoints.webhookTest`. */
	protected abstract get endpoint(): string;

	/** The matching (test) webhook base URL. */
	protected abstract get baseUrl(): string;

	/** Find the chat trigger serving `path`, or `undefined` if there is none. */
	protected abstract findChatTrigger(path: string): Promise<ChatTriggerLookupResult | undefined>;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.baseUrl);
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string): Promise<ProtectedResource | undefined> {
		if (!isChatOAuth2Enabled()) {
			return undefined;
		}

		const { endpoint } = this;
		if (!pathname.startsWith(`/${endpoint}/`)) {
			return undefined;
		}

		const path = trimSlashes(pathname.slice(endpoint.length + 1));

		// Chat shares the generic webhook prefix with every other webhook on the instance, so
		// rule the rest out on the path alone before paying for any cache, DB or registry lookup.
		if (!path.endsWith(`/${CHAT_TRIGGER_PATH_SUFFIX}`)) {
			return undefined;
		}

		const found = await this.findChatTrigger(path);
		if (!found) {
			return undefined;
		}

		const { node, workflowId, workflowName } = found;
		if (!isOAuthProtectedChatTrigger(node, this.config.chatTrigger.disablePublicChat)) {
			return undefined;
		}

		// The bare page URL, with no `?method=` selector: the path is derived from the node's own
		// `webhookId`, so no other node can register it, and the URL doubles as the `client_id`
		// and the single `redirect_uri` — it has to equal the page the visitor loads.
		const resourceUrl = `${trimTrailingSlash(this.baseUrl)}/${endpoint}/${path}`;
		const audiences = [resourceUrl];
		// Opt-in, unlike the MCP/webhook resolvers' `!== false`: defaulting off preserves the
		// existing any-authenticated-visitor behaviour, so turning the chat OAuth2 flag on does
		// not change who may chat with an already-published workflow.
		const requireExecute = node.parameters.requireExecuteAccess === true;
		return {
			// Path included, like the webhook resolver's id: one workflow can hold several chat
			// triggers, each its own resource.
			id: `workflow-chat:${workflowId}:${path}`,
			isFirstParty: true,
			getResourceUrl: () => resourceUrl,
			getAudiences: () => audiences,
			getAllowedRedirectUris: async () => [resourceUrl],
			scopes: CHAT_TRIGGER_SCOPES,
			displayName: workflowName,
			uiHints: CHAT_TRIGGER_CONSENT_HINTS,
			...triggerResourceGate(this.workflowFinderService, {
				audiences,
				executeAccessWorkflowId: requireExecute ? workflowId : undefined,
			}),
		};
	}
}
