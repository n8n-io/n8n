import { createHmac, timingSafeEqual } from 'crypto';

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';
import { IdentifierValidationError, type ITokenIdentifier } from './identifier-interface';
import { parse as parseQueryString } from 'querystring';

const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes — Slack's recommended window

const SlackIdentitySchema = z.object({
	identity: z.string(),
	version: z.number(),
	metadata: z.object({
		source: z.literal('slack-signature'),
		timestamp: z.string(),
		signature: z.string(),
	}),
});

export const SlackSignatureOptionsSchema = z.object({
	signingSecret: z.string().min(1, 'Slack signing secret is required'),
	subjectClaim: z.enum(['user_id', 'team_user']).default('user_id'),
});

const FlatPayloadSchema = z.object({
	user_id: z.string(),
	team_id: z.string().optional(),
	enterprise_id: z.string().optional(),
});

const InteractivePayloadSchema = z.object({
	user: z.object({ id: z.string().optional() }),
	team: z.object({ id: z.string() }).optional(),
	enterprise: z.object({ id: z.string() }).optional(),
});

const EventPayloadSchema = z.object({
	event: z.object({ user: z.string().optional() }),
	team_id: z.string().optional(),
	enterprise_id: z.string().optional(),
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

		const result = SlackIdentitySchema.safeParse(context);
		if (!result.success) {
			throw new IdentifierValidationError('Missing Slack signature verification data');
		}
		this.verifySlackSignature(
			options.signingSecret,
			result.data.metadata.timestamp,
			result.data.identity,
			result.data.metadata.signature,
		);
		this.logger.debug('Slack signature verified');

		return this.deriveKey(result.data.identity, options);
	}

	/**
	 * Derives the storage key from a pre-verified identity context.
	 * Use this only for trusted internal paths where the identity was already
	 * verified upstream (e.g. OAuth callback where identity comes from
	 * encrypted CSRF state).
	 *
	 */
	resolveKey(context: ICredentialContext, identifierOptions: Record<string, unknown>): string {
		const options = this.parseOptions(identifierOptions);
		const result = SlackIdentitySchema.safeParse(context);
		if (!result.success) {
			throw new IdentifierValidationError('Missing Slack signature verification data');
		}
		return this.deriveKey(result.data.identity, options);
	}

	private deriveKey(identity: string, options: SlackSignatureOptions): string {
		const { userId, teamId } = this.extractSlackIdentity(identity);
		if (!userId) {
			throw new IdentifierValidationError('Slack user_id not found in identity');
		}

		if (options.subjectClaim === 'team_user') {
			if (!teamId) {
				throw new IdentifierValidationError('Slack team_id not found for team_user claim');
			}
			return `${teamId}:${userId}`;
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

	/**
	 * Extracts Slack user identity from various payload formats.
	 * Slack sends different payload structures for:
	 * - Slash commands (form-encoded: user_id, team_id)
	 * - Interactive messages (JSON: user.id, team.id)
	 * - Events (JSON: event.user, team_id)
	 */
	private extractSlackIdentity(body: string): {
		userId: string | undefined;
		teamId: string | undefined;
	} {
		const parsedBody = parseQueryString(body);
		return (
			this.extractFlatFieldBody(parsedBody) ??
			this.extractInteractivePayloadBody(parsedBody) ??
			this.extractEventPayloadBody(parsedBody) ?? {
				userId: undefined,
				teamId: undefined,
			}
		);
	}

	/** Slash commands and some interactions: flat fields */
	private extractFlatFieldBody(
		body: unknown,
	): { userId: string; teamId: string | undefined } | undefined {
		const result = FlatPayloadSchema.safeParse(body);
		if (!result.success) return undefined;
		return {
			userId: result.data.user_id,
			teamId: result.data.team_id,
		};
	}

	/** Interactive payloads: nested user object */
	private extractInteractivePayloadBody(
		body: unknown,
	): { userId: string | undefined; teamId: string | undefined } | undefined {
		const result = InteractivePayloadSchema.safeParse(body);
		if (!result.success) return undefined;
		return {
			userId: result.data.user.id,
			teamId: result.data.team?.id,
		};
	}

	/** Event payloads: event.user at top level */
	private extractEventPayloadBody(
		body: unknown,
	): { userId: string | undefined; teamId: string | undefined } | undefined {
		const result = EventPayloadSchema.safeParse(body);
		if (!result.success) return undefined;
		return {
			userId: result.data.event.user,
			teamId: result.data.team_id,
		};
	}
}
