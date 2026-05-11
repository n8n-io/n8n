import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentChatIntegration, type AgentChatIntegrationContext } from '../agent-chat-integration';
import { loadLinearAdapter } from '../esm-loader';

type LinearAuth = { kind: 'apiKey'; token: string } | { kind: 'accessToken'; token: string };

/**
 * Linear platform integration.
 *
 * Linear comments have no interactive UI surface, so this integration omits
 * `supportedComponents` entirely.
 *
 * Mention detection in the Chat SDK is a literal string match on
 * `@<adapter.userName>` in the comment body. The adapter defaults `userName` to
 * `'linear-bot'`, so `createAdapter` eagerly fetches the bot user's
 * Linear display name via GraphQL and passes it in —
 * that way `@AgentName`-style mentions fire `onNewMention` as expected.
 */
@Service()
export class LinearIntegration extends AgentChatIntegration {
	readonly type = 'linear';

	readonly credentialTypes = ['linearApi', 'linearOAuth2Api'];

	readonly displayLabel = 'Linear';

	readonly displayIcon = 'linear';

	constructor(private readonly logger: Logger) {
		super();
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const auth = this.extractAuth(ctx.credential);
		const webhookSecret = this.extractSigningSecret(ctx.credential);
		const userName = await this.fetchDisplayName(auth);

		const { createLinearAdapter } = await loadLinearAdapter();

		return createLinearAdapter({
			...(auth.kind === 'apiKey' ? { apiKey: auth.token } : { accessToken: auth.token }),
			webhookSecret,
			...(userName ? { userName } : {}),
		});
	}

	/**
	 * Determine which auth variant the adapter config expects.
	 *
	 * - `linearApi` stores a personal API key in `apiKey` — passed to the adapter
	 *   as `apiKey` (adapter uses it as-is).
	 * - `linearOAuth2Api` stores an OAuth access token in
	 *   `oauthTokenData.access_token` — passed as `accessToken` (adapter skips
	 *   auto-refresh and treats it as a pre-obtained token, per option B of the
	 *   @chat-adapter/linear README).
	 */
	private extractAuth(credential: Record<string, unknown>): LinearAuth {
		if (typeof credential.apiKey === 'string' && credential.apiKey) {
			return { kind: 'apiKey', token: credential.apiKey };
		}

		const tokenData = credential.oauthTokenData as Record<string, unknown> | undefined;
		const oauthToken = tokenData?.access_token ?? tokenData?.accessToken;
		if (typeof oauthToken === 'string' && oauthToken) {
			return { kind: 'accessToken', token: oauthToken };
		}

		throw new Error(
			'Could not extract an API token from the Linear credential. ' +
				'Please ensure the credential has a valid API key (linearApi) ' +
				'or completed OAuth flow (linearOAuth2Api).',
		);
	}

	private extractSigningSecret(credential: Record<string, unknown>): string {
		const secret = credential.signingSecret;
		if (typeof secret === 'string' && secret) {
			return secret;
		}

		throw new Error(
			'The Linear credential is missing a signing secret, which is required for ' +
				'agent integrations. Edit the credential and add the signing secret from ' +
				'your Linear webhook configuration (Settings → API → Webhooks → Signing secret).',
		);
	}

	/**
	 * Personal API keys go in as a bare `Authorization: <key>` header; OAuth
	 * access tokens need `Authorization: Bearer <token>`. Returns undefined on
	 * any failure — the adapter falls back to its default `linear-bot` name.
	 */
	private async fetchDisplayName(auth: LinearAuth): Promise<string | undefined> {
		const authHeader = auth.kind === 'accessToken' ? `Bearer ${auth.token}` : auth.token;
		try {
			const resp = await fetch('https://api.linear.app/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: authHeader },
				body: JSON.stringify({ query: '{ viewer { displayName } }' }),
			});
			if (!resp.ok) return undefined;

			const json = (await resp.json()) as {
				data?: { viewer?: { displayName?: string } };
			};

			return json.data?.viewer?.displayName;
		} catch (error) {
			this.logger.debug(
				`[LinearIntegration] viewer lookup failed: ${error instanceof Error ? error.message : String(error)}`,
			);

			return undefined;
		}
	}
}
