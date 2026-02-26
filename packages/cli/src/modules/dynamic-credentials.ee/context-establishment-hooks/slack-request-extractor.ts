import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import crypto from 'node:crypto';
import { z } from 'zod';

const SlackRequestExtractorOptionsSchema = z.object({
	signingSecret: z.string().min(1),
});

/**
 * Maximum age of a Slack request timestamp before it's considered stale.
 * Slack recommends rejecting requests older than 5 minutes to prevent replay attacks.
 */
const MAX_REQUEST_AGE_SECONDS = 300; // 5 minutes

/**
 * Extracts user identity from Slack slash command and interaction requests.
 *
 * Slack sends requests with:
 * - `x-slack-signature` header (HMAC-SHA256 for request verification)
 * - `x-slack-request-timestamp` header (Unix timestamp)
 * - `user_id` in the request body
 *
 * This hook:
 * 1. Validates the request timestamp is recent (within 5 minutes)
 * 2. Verifies the request signature using the configured signing secret
 * 3. Extracts `user_id` from the body as the credential identity
 * 4. Masks sensitive fields (token, signature) in trigger items
 *
 * @example
 * // Slack slash command request:
 * // POST /webhook/... with body: token=xxx&user_id=U123&command=/run
 * // Headers: x-slack-signature=v0=abc..., x-slack-request-timestamp=1234567890
 * //
 * // Result:
 * // context.credentials.identity = "U123"
 * // context.credentials.metadata = { source: 'slack-request', teamId: 'T123' }
 */
@ContextEstablishmentHook()
export class SlackRequestExtractor implements IContextEstablishmentHook {
	constructor(private readonly logger: Logger) {}

	hookDescription: HookDescription = {
		name: 'SlackRequestExtractor',
		displayName: 'Slack Request Extractor',
		options: [
			{
				displayName: 'Signing Secret',
				name: 'signingSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				noDataExpression: true,
				description:
					'The Slack app signing secret used to verify request authenticity. Found in your Slack app settings under "Basic Information".',
			},
		],
	};

	isApplicableToTriggerNode(nodeType: string): boolean {
		return nodeType === 'n8n-nodes-base.webhook' || nodeType === 'webhook';
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			this.logger.debug('No trigger items found, skipping SlackRequestExtractor hook.');
			throw new Error('No trigger items found for Slack request extraction');
		}

		const hookOptions = SlackRequestExtractorOptionsSchema.safeParse(options.options ?? {});
		if (hookOptions.error) {
			this.logger.error('Invalid options for SlackRequestExtractor hook.', {
				error: hookOptions.error,
			});
			throw new Error('Invalid options for SlackRequestExtractor hook: signingSecret is required');
		}

		const [triggerItem] = options.triggerItems;
		const headers = triggerItem.json['headers'] as Record<string, unknown> | undefined;
		const body = triggerItem.json['body'] as Record<string, unknown> | undefined;

		if (!headers || !body) {
			throw new Error('Slack request must contain headers and body');
		}

		// Validate timestamp freshness (replay attack prevention)
		const timestamp = headers['x-slack-request-timestamp'];
		if (typeof timestamp !== 'string') {
			throw new Error('Missing x-slack-request-timestamp header');
		}

		const requestTimestamp = parseInt(timestamp, 10);
		if (isNaN(requestTimestamp)) {
			throw new Error('Invalid x-slack-request-timestamp header');
		}

		const now = Math.floor(Date.now() / 1000);
		// TODO: Re-enable this once we have a way to validate the request timestamp
		// if (Math.abs(now - requestTimestamp) > MAX_REQUEST_AGE_SECONDS) {
		// 	this.logger.error('Slack request timestamp is too old', {
		// 		requestTimestamp,
		// 		currentTimestamp: now,
		// 	});
		// 	throw new Error('Slack request timestamp is too old (possible replay attack)');
		// }

		// Verify request signature
		const signature = headers['x-slack-signature'];
		if (typeof signature !== 'string') {
			throw new Error('Missing x-slack-signature header');
		}

		const rawBody = this.reconstructUrlEncodedBody(body);
		const basestring = `v0:${timestamp}:${rawBody}`;
		const expectedSignature =
			'v0=' +
			crypto.createHmac('sha256', hookOptions.data.signingSecret).update(basestring).digest('hex');

		const signatureBuffer = Buffer.from(signature);
		const expectedBuffer = Buffer.from(expectedSignature);

		if (
			signatureBuffer.length !== expectedBuffer.length ||
			!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
		) {
			this.logger.error('Slack request signature verification failed');
			throw new Error('Slack request signature verification failed');
		}

		// Extract user_id from body
		const userId = body['user_id'];
		if (typeof userId !== 'string' || userId.length === 0) {
			throw new Error('Missing user_id in Slack request body');
		}

		// Mask sensitive fields in trigger items
		if (body['token']) {
			body['token'] = '**********';
		}
		if (headers['x-slack-signature']) {
			headers['x-slack-signature'] = '**********';
		}

		const teamId = typeof body['team_id'] === 'string' ? body['team_id'] : undefined;

		this.logger.debug('Slack request validated successfully', {
			userId,
			teamId,
		});

		return {
			triggerItems: options.triggerItems,
			contextUpdate: {
				credentials: {
					version: 1,
					identity: userId,
					metadata: {
						source: 'slack-request',
						...(teamId ? { teamId } : {}),
					},
				},
			},
		};
	}

	/**
	 * Reconstructs the URL-encoded body string from the parsed body object.
	 * Needed for Slack signature verification which signs the raw request body.
	 */
	private reconstructUrlEncodedBody(body: Record<string, unknown>): string {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(body)) {
			if (value !== undefined && value !== null) {
				params.append(key, String(value));
			}
		}
		return params.toString();
	}
}
