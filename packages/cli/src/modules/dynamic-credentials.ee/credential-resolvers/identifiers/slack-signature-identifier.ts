import { createHmac, timingSafeEqual } from 'crypto';

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { IdentifierValidationError, type ITokenIdentifier } from './identifier-interface';

const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes — Slack's recommended window

const SlackMetadataSchema = z.object({
	rawBody: z.string(),
	signature: z.string(),
	timestamp: z.string(),
});

export const SlackSignatureOptionsSchema = z.object({
	signingSecret: z.string().min(1, 'Slack signing secret is required'),
	subjectClaim: z.enum(['user_id', 'team_user']).default('user_id'),
});

type SlackSignatureOptions = z.infer<typeof SlackSignatureOptionsSchema>;

/**
 * Extracts and validates Slack user identity from a credential context
 * that was established by the SlackSignatureExtractor hook.
 *
 * The identity in the credential context is the Slack user_id,
 * and the metadata contains team_id, timestamp, raw body, and signature
 * for re-verification.
 */
@Service()
export class SlackSignatureIdentifier implements ITokenIdentifier {
	constructor(private readonly logger: Logger) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		const result = SlackSignatureOptionsSchema.safeParse(identifierOptions);
		if (!result.success) {
			throw new IdentifierValidationError(
				`Invalid Slack identifier options: ${result.error.message}`,
			);
		}
	}

	/**
	 * Verifies the Slack signature and returns the storage key.
	 * Use this for untrusted entry points (execution-status, authorize, revoke).
	 */
	async resolve(
		context: ICredentialContext,
		identifierOptions: Record<string, unknown>,
	): Promise<string> {
		const options = this.parseOptions(identifierOptions);

		const metadataResult = SlackMetadataSchema.safeParse(context.metadata);
		if (!metadataResult.success) {
			throw new IdentifierValidationError('Missing Slack signature verification data');
		}
		this.verifySlackSignature(
			options.signingSecret,
			metadataResult.data.timestamp,
			metadataResult.data.rawBody,
			metadataResult.data.signature,
		);
		this.logger.debug('Slack signature verified');

		return this.deriveKey(context, options);
	}

	/**
	 * Derives the storage key from a pre-verified identity context.
	 * Use this only for trusted internal paths where the identity was already
	 * verified upstream (e.g. OAuth callback where identity comes from
	 * encrypted CSRF state).
	 */
	resolveKey(context: ICredentialContext, identifierOptions: Record<string, unknown>): string {
		const options = this.parseOptions(identifierOptions);
		return this.deriveKey(context, options);
	}

	private deriveKey(context: ICredentialContext, options: SlackSignatureOptions): string {
		const userId = context.identity;
		if (!userId) {
			throw new IdentifierValidationError('Slack user_id not found in credential context');
		}

		if (options.subjectClaim === 'team_user') {
			const teamId = context.metadata?.team_id;
			if (!teamId || typeof teamId !== 'string') {
				throw new IdentifierValidationError(
					'Slack team_id not found in credential context metadata',
				);
			}
			const subject = `${teamId}:${userId}`;
			this.logger.debug('Slack identity resolved', { subject: `${teamId}:***` });
			return subject;
		}

		return userId;
	}

	private parseOptions(options: Record<string, unknown>): SlackSignatureOptions {
		const result = SlackSignatureOptionsSchema.safeParse(options);
		if (!result.success) {
			this.logger.error('Invalid Slack identifier options', { error: result.error });
			throw new IdentifierValidationError(
				`Invalid Slack identifier options: ${result.error.message}`,
			);
		}
		return result.data;
	}

	private verifySlackSignature(
		signingSecret: string,
		timestamp: string,
		rawBody: string,
		providedSignature: string,
	): void {
		// Replay attack prevention
		const timestampNum = parseInt(timestamp, 10);
		if (isNaN(timestampNum)) {
			throw new IdentifierValidationError('Invalid Slack request timestamp');
		}
		const currentTimeSec = Math.floor(Date.now() / 1000);
		if (Math.abs(currentTimeSec - timestampNum) > MAX_TIMESTAMP_AGE_SECONDS) {
			throw new IdentifierValidationError('Slack request timestamp is too old');
		}

		// Compute expected signature: v0=HMAC-SHA256(signingSecret, v0:timestamp:rawBody)
		const hmac = createHmac('sha256', signingSecret);
		hmac.update(`v0:${timestamp}:${rawBody}`);
		const expectedSignature = `v0=${hmac.digest('hex')}`;

		// Constant-time comparison
		const expectedBuffer = Buffer.from(expectedSignature);
		const actualBuffer = Buffer.from(providedSignature);

		if (
			expectedBuffer.length !== actualBuffer.length ||
			!timingSafeEqual(expectedBuffer, actualBuffer)
		) {
			throw new IdentifierValidationError('Slack signature verification failed');
		}
	}
}
