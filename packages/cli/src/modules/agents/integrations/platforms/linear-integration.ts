import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import {
	AgentChatIntegration,
	type AgentChatIntegrationContext,
	type PlatformActionParams,
	type PlatformContextQueryParams,
} from '../agent-chat-integration';
import { loadLinearAdapter } from '../esm-loader';
import type {
	IntegrationAction,
	IntegrationActionResult,
	IntegrationContextQuery,
} from '../integration-tools';
import { executeLinearAction, executeLinearContextQuery } from './linear-operations';

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

	readonly credentialTypes = ['linearOAuth2Api'];

	readonly displayLabel = 'Linear';

	readonly displayIcon = 'linear';

	readonly builderGuidance = {
		capabilities: [
			'Receive Linear issue/comment events and preserve the current Linear issue/comment context.',
			'Respond in the current Linear conversation when the agent was triggered from Linear.',
			'Read Linear users, teams, projects, labels, issue states, and issues through integration context tools.',
			'Create/update Linear issues and create comments when acting in the connected Linear context.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Linear issues/comments or participate in Linear agent sessions.',
			'The agent needs the current Linear issue/comment subject or should reply into the same Linear conversation.',
			'The user describes Linear as the place where humans will talk to or trigger the agent.',
		],
		useNodeToolWhen: [
			'The agent only needs to search, create, or update Linear tickets as a capability while being triggered from Slack, schedule, Preview, or another source.',
			'The request is ticket management, triage, or customer-feedback filing in Linear without requiring a Linear chat/comment trigger.',
			'The user needs explicit configurable Linear node operations or approval gates for issue creation/update rather than conversation-aware Linear replies.',
		],
	};

	readonly contextQueries: IntegrationContextQuery[] = [
		'get_current_message_context',
		'get_current_subject',
		'get_current_user',
		'get_user',
		'search_users',
		'get_team',
		'search_teams',
		'get_project',
		'search_projects',
		'search_labels',
		'search_issue_states',
		'get_issue',
		'search_issues',
	];

	readonly actions: IntegrationAction[] = [
		'respond',
		'create_issue',
		'update_issue',
		'create_comment',
	];

	constructor(private readonly logger: Logger) {
		super();
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		return await executeLinearContextQuery({
			chat: params.chat,
			query: params.query,
			input: params.input,
		});
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		return await executeLinearAction({
			chat: params.chat,
			descriptor: params.descriptor,
			action: params.action,
			input: params.input,
		});
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const accessToken = this.extractAccessToken(ctx.credential);
		const webhookSecret = this.extractSigningSecret(ctx.credential);
		const userName = await this.fetchDisplayName(accessToken);
		const mode = this.extractMode(ctx.credential);

		const { createLinearAdapter } = await loadLinearAdapter();

		return createLinearAdapter({
			accessToken,
			webhookSecret,
			...(userName ? { userName } : {}),
			...(mode ? { mode } : {}),
		});
	}

	/**
	 * Determine which auth variant the adapter config expects.
	 *
	 * - `linearOAuth2Api` stores an OAuth access token in
	 *   `oauthTokenData.access_token` — passed as `accessToken` (adapter skips
	 *   auto-refresh and treats it as a pre-obtained token, per option B of the
	 *   @chat-adapter/linear README).
	 */
	private extractAccessToken(credential: Record<string, unknown>): string {
		const tokenData = credential.oauthTokenData as Record<string, unknown> | undefined;
		const oauthToken = tokenData?.access_token ?? tokenData?.accessToken;
		if (typeof oauthToken === 'string' && oauthToken) {
			return oauthToken;
		}

		throw new Error(
			'Could not extract an OAuth access token from the Linear credential. ' +
				'Please ensure the credential has completed the OAuth flow (linearOAuth2Api).',
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

	private extractMode(credential: Record<string, unknown>): 'agent-sessions' | undefined {
		return credential.actor === 'app' ? 'agent-sessions' : undefined;
	}

	/**
	 * OAuth access tokens need `Authorization: Bearer <token>`. Returns
	 * undefined on any failure — the adapter falls back to its default
	 * `linear-bot` name.
	 */
	private async fetchDisplayName(accessToken: string): Promise<string | undefined> {
		try {
			const resp = await fetch('https://api.linear.app/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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
