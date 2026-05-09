import { Service } from '@n8n/di';

import {
	AgentChatIntegration,
	type AgentChatIntegrationContext,
	type UnauthenticatedWebhookResponse,
} from '../agent-chat-integration';
import { loadSlackAdapter } from '../esm-loader';

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

	readonly credentialTypes = ['slackApi', 'slackOAuth2Api'];

	readonly displayLabel = 'Slack';

	readonly displayIcon = 'slack';

	readonly supportedComponents = [
		'section',
		'button',
		'select',
		'radio_select',
		'divider',
		'image',
		'fields',
	];

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
	 * Extract the bot token from a decrypted Slack credential.
	 *
	 * - `slackApi` stores the token as `accessToken`.
	 * - `slackOAuth2Api` stores the token inside `oauthTokenData.access_token`.
	 */
	private extractBotToken(credential: Record<string, unknown>): string {
		let token: string | undefined;

		if (typeof credential.accessToken === 'string' && credential.accessToken) {
			token = credential.accessToken;
		}

		if (!token) {
			const tokenData = credential.oauthTokenData as Record<string, unknown> | undefined;
			const oauthToken = tokenData?.access_token ?? tokenData?.accessToken;
			if (typeof oauthToken === 'string' && oauthToken) {
				token = oauthToken;
			}
		}

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
