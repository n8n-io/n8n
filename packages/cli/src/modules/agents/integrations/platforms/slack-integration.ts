import { Service } from '@n8n/di';

import {
	AgentChatIntegration,
	type AgentChatIntegrationContext,
	type PlatformActionParams,
	type PlatformContextQueryParams,
	type UnauthenticatedWebhookResponse,
} from '../agent-chat-integration';
import { loadSlackAdapter } from '../esm-loader';
import type {
	IntegrationAction,
	IntegrationActionResult,
	IntegrationContextQuery,
} from '../integration-tools';
import { executeSlackAction, executeSlackContextQuery } from './slack-operations';

/**
 * Slack platform integration.
 *
 * Slack callback_data has no small limit and supports every component type
 * the rich_interaction tool emits, so no normalization or callback shortening
 * is required.
 */
@Service()
export class SlackIntegration extends AgentChatIntegration {
	readonly type = 'slack';

	readonly credentialTypes = ['slackApi'];

	readonly displayLabel = 'Slack';

	readonly displayIcon = 'slack';

	readonly builderGuidance = {
		capabilities: [
			'Receive Slack mentions and messages as agent triggers.',
			'Respond in the latest Slack thread, DM, or channel conversation context.',
			'Send DMs and channel messages, search users/channels, and add emoji reactions.',
			'Render rich interaction cards in Slack messages.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Slack, invoked with @mentions, or keep conversing in Slack threads.',
			'The agent needs Slack message context, user/channel lookup, DMs, channel messages, emoji reactions, or rich UI in Slack.',
			'The agent should communicate as the connected Slack bot rather than merely call Slack as a backend API.',
		],
		useNodeToolWhen: [
			'Slack is only a backend API step in a broader task and the agent does not need Slack conversation context.',
			'The user asks for a one-off Slack operation from another trigger and does not need the agent connected as a Slack chat surface.',
		],
	};

	readonly supportedComponents = [
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
		'get_current_channel_info',
		'get_user',
		'get_channel_info',
		'search_users',
		'search_channels',
	];

	readonly actions: IntegrationAction[] = [
		'respond',
		'send_dm',
		'send_channel_message',
		'add_reaction',
	];

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		return await executeSlackContextQuery({
			chat: params.chat,
			query: params.query,
			input: params.input,
		});
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		return await executeSlackAction({
			chat: params.chat,
			descriptor: params.descriptor,
			action: params.action,
			input: params.input,
			currentMessageContext: params.currentMessageContext,
		});
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const botToken = this.extractBotToken(ctx.credential);
		const signingSecret = this.extractSigningSecret(ctx.credential);
		const { createSlackAdapter } = await loadSlackAdapter();
		return createSlackAdapter({ botToken, signingSecret });
	}

	/**
	 * Echo Slack's `url_verification` challenge so the webhook URL can be
	 * verified during manifest install — before the user has configured the
	 * bot token + signing secret in n8n. Slack's docs:
	 * https://api.slack.com/events/url_verification
	 */
	handleUnauthenticatedWebhook(body: unknown): UnauthenticatedWebhookResponse | undefined {
		if (!body || typeof body !== 'object') return undefined;
		const evt = body as { type?: unknown; challenge?: unknown };
		if (evt.type === 'url_verification' && typeof evt.challenge === 'string') {
			return { status: 200, body: { challenge: evt.challenge } };
		}
		return undefined;
	}

	/**
	 * Extract the bot token from a decrypted Slack bot-token credential.
	 */
	private extractBotToken(credential: Record<string, unknown>): string {
		const token =
			typeof credential.accessToken === 'string' && credential.accessToken
				? credential.accessToken
				: undefined;

		if (!token) {
			throw new Error(
				'Could not extract a bot token from the Slack credential. ' +
					'Please ensure the credential has a valid access token.',
			);
		}

		if (!token.startsWith('xoxb-')) {
			const prefix = token.split('-')[0] ?? 'unknown';
			throw new Error(
				`The Slack credential contains a "${prefix}-" token, but agent integrations require a Bot User OAuth Token ("xoxb-"). ` +
					'You can find this in your Slack app under OAuth & Permissions → Bot User OAuth Token.',
			);
		}

		return token;
	}

	private extractSigningSecret(credential: Record<string, unknown>): string {
		const secret = credential.signatureSecret;
		if (typeof secret === 'string' && secret) {
			return secret;
		}

		throw new Error(
			'The Slack credential is missing a signing secret, which is required for agent integrations. ' +
				'Edit the credential and add your Slack app\'s "Signing Secret" (found under Basic Information in the Slack API dashboard).',
		);
	}
}
