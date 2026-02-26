import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { z } from 'zod';

import { verifySlackSignature } from '../services/slack-signature-verification';

const SlackRequestExtractorOptionsSchema = z.object({
	signingSecret: z.string().min(1),
});

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

		// Validate timestamp header
		const timestamp = headers['x-slack-request-timestamp'];
		if (typeof timestamp !== 'string') {
			throw new Error('Missing x-slack-request-timestamp header');
		}

		// Verify request signature
		const signature = headers['x-slack-signature'];
		if (typeof signature !== 'string') {
			throw new Error('Missing x-slack-signature header');
		}

		verifySlackSignature(hookOptions.data.signingSecret, timestamp, body, signature);

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
}
