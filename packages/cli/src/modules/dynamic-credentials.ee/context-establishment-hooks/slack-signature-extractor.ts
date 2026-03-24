import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	type ContextEstablishmentOptions,
	type ContextEstablishmentResult,
	type HookDescription,
	type IContextEstablishmentHook,
} from '@n8n/decorators';

function isHeaderObject(obj: unknown): obj is Record<string, unknown> {
	return obj !== null && obj !== undefined && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Extracts Slack identity from webhook requests.
 *
 * Pulls user_id, team_id, and enterprise_id from the Slack payload body,
 * and carries the raw signature data (timestamp, rawBody, signature) in
 * metadata so the SlackCredentialResolver can verify the signature using
 * the signing secret from its encrypted config.
 *
 * This hook does NOT verify the signature — that is the resolver's
 * responsibility, just like the BearerTokenExtractor does not validate
 * tokens and the OAuthCredentialResolver does introspection.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
@ContextEstablishmentHook()
export class SlackSignatureExtractor implements IContextEstablishmentHook {
	constructor(private readonly logger: Logger) {}

	hookDescription: HookDescription = {
		name: 'SlackSignatureExtractor',
		displayName: 'Slack Identity Extractor',
		options: [],
	};

	isApplicableToTriggerNode(nodeType: string): boolean {
		return nodeType === 'n8n-nodes-base.webhook' || nodeType === 'webhook';
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			throw new Error('No trigger items found for Slack identity extraction');
		}

		const [triggerItem] = options.triggerItems;
		const headers = triggerItem.json['headers'];

		if (!isHeaderObject(headers)) {
			throw new Error('No headers found in trigger item for Slack identity extraction');
		}

		// Extract Slack-specific headers
		const timestamp = this.getHeader(headers, 'x-slack-request-timestamp');
		const signature = this.getHeader(headers, 'x-slack-signature');

		if (!timestamp) {
			throw new Error('Missing X-Slack-Request-Timestamp header');
		}
		if (!signature) {
			throw new Error('Missing X-Slack-Signature header');
		}

		// Get the raw body — needed by the resolver for signature verification
		const rawBody = this.getRawBody(triggerItem);

		// Extract identity from the Slack payload
		const body = triggerItem.json['body'];
		const { userId, teamId, enterpriseId } = this.extractSlackIdentity(body);

		if (!userId) {
			throw new Error('Could not extract user_id from Slack payload');
		}

		// Mask Slack signature headers in trigger items to avoid leaking them
		headers['x-slack-signature'] = '**********';
		headers['x-slack-request-timestamp'] = '**********';

		this.logger.debug('Slack identity extracted', {
			userId,
			teamId: teamId ?? 'unknown',
		});

		return {
			triggerItems: options.triggerItems,
			contextUpdate: {
				credentials: {
					version: 1,
					identity: userId,
					metadata: {
						source: 'slack-signature',
						team_id: teamId,
						enterprise_id: enterpriseId,
						// Carry raw verification data so the resolver can verify
						// the signature using the signing secret from its config
						timestamp,
						rawBody,
						signature,
					},
				},
			},
		};
	}

	private getHeader(headers: Record<string, unknown>, name: string): string | undefined {
		const value = headers[name] ?? headers[name.toLowerCase()];
		return typeof value === 'string' ? value : undefined;
	}

	/**
	 * Extracts the raw body string from the trigger item.
	 * Slack sends form-encoded payloads for slash commands and interactions.
	 */
	private getRawBody(triggerItem: { json: Record<string, unknown> }): string {
		// The webhook node stores rawBody when available
		if (typeof triggerItem.json['rawBody'] === 'string') {
			return triggerItem.json['rawBody'];
		}

		// Fallback: reconstruct from body if it's a string
		const body = triggerItem.json['body'];
		if (typeof body === 'string') {
			return body;
		}

		// Fallback: reconstruct URL-encoded form body (Slack sends form-urlencoded)
		if (body !== null && body !== undefined && typeof body === 'object') {
			return new URLSearchParams(body as Record<string, string>).toString();
		}

		throw new Error('Could not retrieve raw body for Slack identity extraction');
	}

	/**
	 * Extracts Slack user identity from various payload formats.
	 * Slack sends different payload structures for:
	 * - Slash commands (form-encoded: user_id, team_id)
	 * - Interactive messages (JSON: user.id, team.id)
	 * - Events (JSON: event.user, team_id)
	 */
	private extractSlackIdentity(body: unknown): {
		userId: string | undefined;
		teamId: string | undefined;
		enterpriseId: string | undefined;
	} {
		if (!body || typeof body !== 'object') {
			return { userId: undefined, teamId: undefined, enterpriseId: undefined };
		}

		const payload = body as Record<string, unknown>;

		// Slash commands and some interactions: flat fields
		if (typeof payload['user_id'] === 'string') {
			return {
				userId: payload['user_id'],
				teamId: typeof payload['team_id'] === 'string' ? payload['team_id'] : undefined,
				enterpriseId:
					typeof payload['enterprise_id'] === 'string' ? payload['enterprise_id'] : undefined,
			};
		}

		// Interactive payloads: nested user object
		const user = payload['user'];
		if (user && typeof user === 'object' && 'id' in user) {
			const userObj = user as Record<string, unknown>;
			const team = payload['team'] as Record<string, unknown> | undefined;
			const enterprise = payload['enterprise'] as Record<string, unknown> | undefined;
			return {
				userId: typeof userObj['id'] === 'string' ? userObj['id'] : undefined,
				teamId: team && typeof team['id'] === 'string' ? team['id'] : undefined,
				enterpriseId:
					enterprise && typeof enterprise['id'] === 'string' ? enterprise['id'] : undefined,
			};
		}

		// Event payloads: event.user at top level
		const event = payload['event'];
		if (event && typeof event === 'object') {
			const eventObj = event as Record<string, unknown>;
			return {
				userId: typeof eventObj['user'] === 'string' ? eventObj['user'] : undefined,
				teamId: typeof payload['team_id'] === 'string' ? payload['team_id'] : undefined,
				enterpriseId:
					typeof payload['enterprise_id'] === 'string' ? payload['enterprise_id'] : undefined,
			};
		}

		return { userId: undefined, teamId: undefined, enterpriseId: undefined };
	}
}
