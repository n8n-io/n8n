import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { RichCardComponentType } from '@n8n/api-types';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	AgentChatIntegration,
	type PlatformActionParams,
	type PlatformContextQueryParams,
} from '../agent-chat-integration';
import { respondInputSchema } from '../integration-action-executor';
import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import { integrationError, unsupportedQuery } from '../integration-helpers';
import type {
	IntegrationAction,
	IntegrationActionResult,
	IntegrationContextQuery,
} from '../integration-tools';

/**
 * The in-app chat channel ("n8n Chat").
 *
 * Implicit and credential-less: never persisted in an agent's `integrations`
 * array and never shown in the integrations catalog. A synthetic tool
 * descriptor is injected per-run when the execution comes through the in-app
 * chat endpoints (see agent-runtime-reconstruction.service.ts). `respond`
 * does not post anywhere — the card renders from the tool-call input in the
 * chat UI, and interactive cards suspend through the generic machinery.
 */
@Service()
export class N8nChatIntegration extends AgentChatIntegration {
	readonly type = N8N_CHAT_INTEGRATION_TYPE;

	readonly credentialTypes: string[] = [];

	readonly displayLabel = 'n8n Chat';

	readonly displayIcon = 'message-square';

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

	readonly contextQueries: IntegrationContextQuery[] = [
		'get_current_message_context',
		'get_current_subject',
		'get_current_user',
	];

	readonly actions: IntegrationAction[] = ['respond'];

	constructor(private readonly userRepository: UserRepository) {
		super();
	}

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The n8n chat integration has no platform adapter.');
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		if (params.action !== 'respond') return undefined;
		const parsed = respondInputSchema.safeParse(params.input);
		if (!parsed.success) {
			return integrationError(INTEGRATION_ERROR_CODES.ACTION_FAILED, parsed.error.message);
		}
		// Text-only responds deliver nothing in the in-app chat (the agent's
		// normal reply IS this channel) — returning ok would trick the model
		// into believing the text reached the user. Fail with a self-correcting
		// message instead.
		if (!parsed.data.message.card) {
			return integrationError(
				INTEGRATION_ERROR_CODES.ACTION_FAILED,
				'Plain text is not delivered through this tool in the n8n chat — your normal assistant reply already reaches the user, so write the text directly in your reply. Call this tool only with message.card to render a rich card.',
			);
		}
		if (!params.currentMessageContext) {
			return integrationError(
				INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				'There is no current message context.',
			);
		}
		// No external post: the chat UI renders the card from the tool-call
		// input. Echo the context so the thread target stays current.
		// The tool boundary validates via `validateActionOperationSchema`
		// (integration-tools.ts) and the executor parses respond input with
		// `respondInputSchema`; this parse guards direct executor calls.
		return {
			ok: true,
			messageContext: {
				...params.currentMessageContext,
				messageId: undefined,
				updatedAt: new Date().toISOString(),
			},
		};
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		// `get_current_user` is handled generically: integration-tools reads
		// `interactingUserId` from the stored context and delegates here as
		// `get_user`. Agents cannot call `get_user` directly (not declared in
		// `contextQueries`, so it is absent from the tool input schema).
		if (params.query === 'get_user') {
			const userId = typeof params.input.userId === 'string' ? params.input.userId : undefined;
			if (!userId) {
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
					'userId is required.',
				);
			}
			const user = await this.userRepository.findOneBy({ id: userId });
			if (!user) {
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
					`User ${userId} not found.`,
				);
			}
			return {
				ok: true,
				user: {
					id: user.id,
					name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
					email: user.email,
				},
			};
		}
		return unsupportedQuery(this.type, params.query);
	}
}
