import { Logger } from '@n8n/backend-common';
import { z } from 'zod';
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
			this.logger.error('No trigger items found for Slack identity extraction');
			throw new Error('No trigger items found for Slack identity extraction');
		}

		const [triggerItem] = options.triggerItems;
		const headers = triggerItem.json['headers'];

		if (!isHeaderObject(headers)) {
			this.logger.error('No headers found in trigger item for Slack identity extraction');
			throw new Error('No headers found in trigger item for Slack identity extraction');
		}

		// Extract Slack-specific headers
		const timestamp = this.getHeader(headers, 'x-slack-request-timestamp');
		const signature = this.getHeader(headers, 'x-slack-signature');

		if (!timestamp) {
			this.logger.error('Missing X-Slack-Request-Timestamp header');
			throw new Error('Missing X-Slack-Request-Timestamp header');
		}
		if (!signature) {
			this.logger.error('Missing X-Slack-Signature header');
			throw new Error('Missing X-Slack-Signature header');
		}

		// Get the raw body — needed by the resolver for signature verification
		const rawBody = this.getRawBody(triggerItem);

		// Mask Slack signature headers in trigger items to avoid leaking them
		headers['x-slack-signature'] = '**********';
		headers['x-slack-request-timestamp'] = '**********';

		return {
			triggerItems: options.triggerItems,
			contextUpdate: {
				credentials: {
					identity: rawBody,
					version: 1,
					metadata: {
						source: 'slack-signature',
						timestamp,
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
	 * Reconstructs the URL-encoded form body from the parsed body object.
	 * Slack sends form-urlencoded payloads for slash commands and interactions,
	 * which n8n parses into a JSON object. We reconstruct the encoded string
	 * to use as the HMAC input for Slack signature verification.
	 */
	private getRawBody(triggerItem: { json: Record<string, unknown> }): string {
		const result = z.record(z.string(), z.string()).safeParse(triggerItem.json['body']);

		if (!result.success) {
			this.logger.error('Could not retrieve raw body for Slack signature verification');
			throw new Error('Could not retrieve raw body for Slack signature verification.');
		}

		return new URLSearchParams(result.data).toString();
	}
}
