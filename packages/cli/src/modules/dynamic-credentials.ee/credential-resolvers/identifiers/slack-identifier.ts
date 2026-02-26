import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import axios from 'axios';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError, ITokenIdentifier } from './identifier-interface';
import { sha256 } from './oauth2-utils';

const MIN_TOKEN_CACHE_TIMEOUT = 30 * Time.seconds.toMilliseconds;
const MAX_TOKEN_CACHE_TIMEOUT = 5 * Time.minutes.toMilliseconds;
const DEFAULT_CACHE_TIMEOUT = 60 * Time.seconds.toMilliseconds;

const SLACK_AUTH_TEST_URL = 'https://slack.com/api/auth.test';

const SlackAuthTestOptionsSchema = z.object({
	validation: z.literal('slack-auth-test'),
	subjectClaim: z.string().optional().default('user_id'),
});

const SlackRequestOptionsSchema = z.object({
	validation: z.literal('slack-request'),
});

export const SlackOptionsSchema = z.discriminatedUnion('validation', [
	SlackAuthTestOptionsSchema,
	SlackRequestOptionsSchema,
]);

export type SlackOptions = z.infer<typeof SlackOptionsSchema>;

const SlackAuthTestResponseSchema = z
	.object({
		ok: z.boolean(),
		error: z.string().optional(),
		url: z.string().optional(),
		team: z.string().optional(),
		user: z.string().optional(),
		team_id: z.string().optional(),
		user_id: z.string().optional(),
		bot_id: z.string().optional(),
		is_enterprise_install: z.boolean().optional(),
		enterprise_id: z.string().optional(),
	})
	.passthrough();

export type SlackAuthTestResponse = z.infer<typeof SlackAuthTestResponseSchema>;

const CACHE_PREFIX = 'slack-identifier';

/**
 * Slack token identifier.
 *
 * Supports two validation modes:
 *
 * 1. **slack-auth-test**: Validates Slack API tokens (xoxp-*, xoxb-*) via the
 *    `auth.test` API. Use this when a Slack app forwards a user token as a
 *    Bearer token in the Authorization header (BearerTokenExtractor hook).
 *
 * 2. **slack-request**: Passthrough mode for pre-validated identities. Use this
 *    when the SlackRequestExtractor hook has already verified the request
 *    signature and extracted the user_id. The identity is used directly as
 *    the subject without any API call.
 */
@Service()
export class SlackIdentifier implements ITokenIdentifier {
	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
	) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		this.parseOptions(identifierOptions);
	}

	async resolve(
		context: ICredentialContext,
		identifierOptions: Record<string, unknown>,
	): Promise<string> {
		const options = this.parseOptions(identifierOptions);

		if (options.validation === 'slack-request') {
			return this.resolveFromRequest(context);
		}

		return await this.resolveFromAuthTest(context, options);
	}

	// ------------------------ Private Methods ----------------------- //

	/**
	 * Passthrough mode: the SlackRequestExtractor hook already validated the
	 * request signature and extracted the user_id. Use identity directly.
	 */
	private resolveFromRequest(context: ICredentialContext): string {
		if (!context.identity || context.identity.length === 0) {
			throw new IdentifierValidationError('Empty identity from Slack request');
		}

		this.logger.debug('Using pre-validated Slack identity', { subject: context.identity });
		return context.identity;
	}

	/**
	 * API mode: validates a Slack token via auth.test and extracts the subject claim.
	 */
	private async resolveFromAuthTest(
		context: ICredentialContext,
		options: z.infer<typeof SlackAuthTestOptionsSchema>,
	): Promise<string> {
		const hashedToken = sha256(context.identity);
		const cacheKey = `${CACHE_PREFIX}:subject:${hashedToken}`;
		const cached = await this.cache.get<string>(cacheKey);
		if (cached) {
			return cached;
		}

		const authResponse = await this.callAuthTest(context.identity);

		const subject = authResponse[options.subjectClaim];
		if (!subject) {
			this.logger.error(`Slack auth.test response missing subject claim (${options.subjectClaim})`);
			throw new IdentifierValidationError(
				`Slack auth.test response missing subject claim (${options.subjectClaim})`,
			);
		}

		const subjectStr = String(subject);
		this.logger.debug('Slack token validated successfully', { subject: subjectStr });

		const ttl = this.calculateTtl();
		await this.cache.set(cacheKey, subjectStr, ttl);
		return subjectStr;
	}

	private parseOptions(options: Record<string, unknown>): SlackOptions {
		try {
			return SlackOptionsSchema.parse(options);
		} catch (error) {
			this.logger.error('Invalid Slack identifier options', { error });
			throw new IdentifierValidationError('Invalid Slack identifier options', {
				cause: error,
			});
		}
	}

	private async callAuthTest(token: string): Promise<SlackAuthTestResponse> {
		const response = await axios.post(
			SLACK_AUTH_TEST_URL,
			{},
			{
				headers: { authorization: `Bearer ${token}` },
				validateStatus: () => true,
				timeout: 10 * Time.seconds.toMilliseconds,
			},
		);

		if (response.status !== 200) {
			this.logger.error('Slack auth.test HTTP request failed', {
				status: response.status,
			});
			throw new IdentifierValidationError('Slack auth.test HTTP request failed');
		}

		const data = this.parseAuthTestResponse(response.data);

		if (!data.ok) {
			this.logger.error('Slack auth.test returned error', { error: data.error });
			throw new IdentifierValidationError(
				`Slack auth.test failed: ${data.error ?? 'unknown error'}`,
			);
		}

		return data;
	}

	private parseAuthTestResponse(data: unknown): SlackAuthTestResponse {
		try {
			return SlackAuthTestResponseSchema.parse(data);
		} catch (error) {
			this.logger.error('Invalid Slack auth.test response format', { error });
			throw new IdentifierValidationError('Invalid Slack auth.test response format');
		}
	}

	private calculateTtl(): number {
		return Math.max(
			MIN_TOKEN_CACHE_TIMEOUT,
			Math.min(DEFAULT_CACHE_TIMEOUT, MAX_TOKEN_CACHE_TIMEOUT),
		);
	}
}
