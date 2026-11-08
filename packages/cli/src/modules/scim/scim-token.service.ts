import { type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { UrlService } from '@n8n/backend-services';

import { ScimTokenRepository } from './database/scim-token.repository';

/** Makes the token easy to recognize, for example for a secret scanner. */
const TOKEN_PREFIX = 'n8n_scim_';
/** 256 random bits. */
const TOKEN_RANDOM_BYTES = 32;
/** The prefix and 32 bytes as base64url, which gives 43 characters. */
const TOKEN_FORMAT = /^n8n_scim_[\w-]{43}$/;
const TOKEN_HINT_LENGTH = 4;

/**
 * The database keeps this hash, not the token. The token has 256 random
 * bits, so a fast hash without a salt is enough.
 */
export const hashScimToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Compares two hex hashes in constant time. */
const hashesMatch = (a: string, b: string) => {
	const left = Buffer.from(a, 'hex');
	const right = Buffer.from(b, 'hex');
	return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Manages the one SCIM token of the instance. Every user with `scim:manage`
 * sees, rotates and revokes the same token.
 *
 * The full token value leaves this service only from `rotateToken`, once.
 */
@Service()
export class ScimTokenService {
	constructor(
		private readonly scimTokenRepository: ScimTokenRepository,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Whether the instance has a SCIM token and, if so, its last four
	 * characters for display.
	 */
	async getTokenInfo(
		ctx: OperationContext = {},
	): Promise<{ hasToken: boolean; lastFour: string | null }> {
		const token = await this.scimTokenRepository.findInstanceToken(ctx);

		return {
			hasToken: !!token,
			lastFour: token ? token.tokenHint : null,
		};
	}

	/**
	 * Verify a SCIM token. The hash of the token must match the hash of the
	 * stored instance token. Its creator does not matter.
	 */
	async verifyApiKey(apiKey: string, ctx: OperationContext = {}): Promise<boolean> {
		// A value in another format cannot be the token, so skip the read.
		if (!TOKEN_FORMAT.test(apiKey)) return false;

		// A database failure is not the caller's fault, so let it propagate.
		// Reporting a database outage as an invalid token would tell the IdP to
		// treat its credential as revoked.
		const current = await this.scimTokenRepository.findInstanceToken(ctx);

		return !!current && hashesMatch(current.tokenHash, hashScimToken(apiKey));
	}

	/**
	 * Create the instance token, or replace the current one. The previous
	 * token stops working at once. Returns the token value, which no other
	 * call can return later.
	 *
	 * Throws `ScimTokenConflictError` when another request changed the token
	 * after this one read it.
	 */
	async rotateToken(user: User, ctx: OperationContext = {}): Promise<string> {
		const current = await this.scimTokenRepository.findInstanceToken(ctx);
		const token = TOKEN_PREFIX + randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');

		await this.scimTokenRepository.replace(
			current?.tokenHash ?? null,
			{
				tokenHash: hashScimToken(token),
				tokenHint: token.slice(-TOKEN_HINT_LENGTH),
				createdById: user.id,
				createdAt: new Date(),
			},
			ctx,
		);

		return token;
	}

	/** Revoke the instance token, whoever created it. */
	async revokeToken(ctx: OperationContext = {}) {
		await this.scimTokenRepository.revokeInstanceToken(ctx);
	}

	/**
	 * Get SCIM base URL
	 */
	getScimBaseUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}/scim/v2`;
	}
}
