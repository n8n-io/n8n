import type { RichCardComponentType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { AgentChatIntegration, type PlatformActionParams } from '../agent-chat-integration';
import { respondInputSchema } from '../integration-action-executor';
import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import { integrationError } from '../integration-helpers';
import type { IntegrationActionResult } from '../integration-tools';

/** `integrationType` and execution `source` of a turn a built app started. */
export const APP_CHAT_INTEGRATION_TYPE = 'app' as const;

/**
 * The channel a built app chats through (`/apps/<ns>/api/agents/<key>/chat`).
 *
 * Like the in-app n8n chat it is implicit and credential-less: never stored on
 * an agent and never listed in the catalog. The app runtime injects it per run
 * (see agent-runtime-reconstruction.service.ts). `respond` posts nowhere — the
 * app renders the card from the `respond` tool-call input it sees on the SSE
 * stream, and interactive cards suspend through the generic machinery.
 */
@Service()
export class AppChatIntegration extends AgentChatIntegration {
	readonly type = APP_CHAT_INTEGRATION_TYPE;

	readonly credentialTypes: string[] = [];

	readonly displayLabel = 'App';

	readonly displayIcon = 'app-window';

	readonly internal = true;

	readonly requiresChatInstance = false;

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'select',
		'radio_select',
		'divider',
		'image',
		'fields',
	];

	readonly actionToolGuidance = [
		'This is a web app chatting with you: your normal assistant reply already reaches the visitor. NEVER call respond with only message.text — write that text directly in your reply instead. Call this tool only with message.card, to render a rich card or collect structured input.',
	];

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The app chat integration has no platform adapter.');
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		if (params.action !== 'respond') return undefined;
		const parsed = respondInputSchema.safeParse(params.input);
		if (!parsed.success) {
			return integrationError(INTEGRATION_ERROR_CODES.ACTION_FAILED, parsed.error.message);
		}
		// Text-only responds deliver nothing: the agent's reply IS this channel.
		if (!parsed.data.message.card) {
			return integrationError(
				INTEGRATION_ERROR_CODES.ACTION_FAILED,
				'Plain text is not delivered through this tool in an app — your normal assistant reply already reaches the visitor, so write the text directly in your reply. Call this tool only with message.card to render a rich card.',
			);
		}
		if (!params.currentMessageContext) {
			return integrationError(
				INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				'There is no current message context.',
			);
		}
		return {
			ok: true,
			messageContext: {
				...params.currentMessageContext,
				messageId: undefined,
				updatedAt: new Date().toISOString(),
			},
		};
	}
}
