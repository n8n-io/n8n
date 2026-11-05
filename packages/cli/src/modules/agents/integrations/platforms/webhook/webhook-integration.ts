import {
	WEBHOOK_INTEGRATION_TYPE,
	webhookAuthentication,
	webhookCredentialType,
	type AgentIntegrationConfig,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { BadRequestError, UnexpectedError } from '@n8n/errors';

import { AgentChatIntegration } from '../../agent-chat-integration';

/**
 * The webhook channel: an external caller sends a message over HTTP and gets the
 * reply in the same response. It has no platform runtime, and its credential only
 * checks the caller.
 */
@Service()
export class WebhookIntegration extends AgentChatIntegration {
	readonly type = WEBHOOK_INTEGRATION_TYPE;

	readonly credentialTypes = ['httpHeaderAuth', 'jwtAuth'];

	readonly displayLabel = 'Webhook';

	readonly displayIcon = 'webhook';

	readonly requiresChatInstance = false;

	/** There is one URL for each agent, so a request cannot tell two connections apart. */
	readonly singleConnectionPerAgent = true;

	readonly builderGuidance = {
		capabilities: [
			'Let an external system or a backend send a message to the published agent over HTTP and get the reply in the same response.',
			'Continue a conversation when the caller sends back the conversation ID.',
			'Ask the caller to approve an action that needs approval: the reply gives a URL, and the caller sends the decision to it.',
		],
		useIntegrationWhen: [
			'The user wants to call the agent from their own backend or server-side app over HTTP. Browser apps cannot call it yet.',
		],
		useNodeToolWhen: [
			'The agent itself must call an external HTTP API. Use an HTTP Request node tool for that.',
		],
	};

	acceptedCredentialTypes(integration: AgentIntegrationConfig): string[] {
		const credentialType = webhookCredentialType(
			integration.type === this.type ? integration.settings : undefined,
		);
		return credentialType ? [credentialType] : [];
	}

	validateConfig(integration: AgentIntegrationConfig): void {
		if (integration.type !== this.type) return;
		const authentication = webhookAuthentication(integration);
		if (!authentication) {
			throw new BadRequestError('Webhook authentication is required');
		}
		const hasCredential = integration.credentialId.trim() !== '';
		if (authentication === 'none' && hasCredential) {
			throw new BadRequestError('A webhook without authentication takes no credential');
		}
		if (authentication !== 'none' && !hasCredential) {
			throw new BadRequestError('This webhook authentication needs a credential');
		}
	}

	/** The webhook channel has no platform context to store on a message. */
	buildOriginDraft() {
		return undefined;
	}

	/** Callers have no identity, so a webhook turn has no episodic memory. */
	resolveEpisodicScope() {
		return null;
	}

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The webhook integration has no platform adapter.');
	}
}
