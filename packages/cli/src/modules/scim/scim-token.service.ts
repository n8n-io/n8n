import { type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, randomUUID } from 'crypto';

import { JwtService, UrlService } from '@n8n/backend-services';

import { ScimTokenRepository } from './database/scim-token.repository';

const API_KEY_PURPOSE = 'scimApiKey' as const;
const API_KEY_ISSUER = 'n8n';
/**
 * The token belongs to the instance, so its subject names no user. Tokens
 * from before the instance token have a user ID as subject. The check does
 * not read the subject, so these tokens stay valid.
 */
const API_KEY_SUBJECT = 'scim-provisioning';
const TOKEN_HINT_LENGTH = 4;

/**
 * The database keeps this hash, not the token. The token is a signed JWT
 * with a random ID, so a fast hash without a salt is enough.
 */
export const hashScimToken = (token: string) => createHash('sha256').update(token).digest('hex');

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
		private readonly jwtService: JwtService,
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
	 * Verify a SCIM token. The token must be a valid JWT and be the stored
	 * instance token. Its creator does not matter.
	 */
	async verifyApiKey(apiKey: string, ctx: OperationContext = {}): Promise<boolean> {
		try {
			this.jwtService.verify(API_KEY_PURPOSE, apiKey, { issuer: API_KEY_ISSUER });
		} catch {
			// A malformed, expired or wrongly-audienced token is simply not valid.
			return false;
		}

		// A database failure is not the caller's fault, so let it propagate.
		// Reporting a database outage as an invalid token would tell the IdP to
		// treat its credential as revoked.
		return !!(await this.scimTokenRepository.findByTokenHash(hashScimToken(apiKey), ctx));
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
		const token = this.signToken();

		await this.scimTokenRepository.replace(
			current?.tokenHash ?? null,
			{
				tokenHash: hashScimToken(token),
				tokenHint: token.slice(-TOKEN_HINT_LENGTH),
				createdById: user.id,
			},
			ctx,
		);

		return token;
	}

	/** Revoke the instance token, whoever created it. */
	async revokeToken(ctx: OperationContext = {}) {
		await this.scimTokenRepository.deleteInstanceToken(ctx);
	}

	/**
	 * Get SCIM base URL
	 */
	getScimBaseUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}/scim/v2`;
	}

	private signToken() {
		return this.jwtService.sign(API_KEY_PURPOSE, {
			sub: API_KEY_SUBJECT,
			iss: API_KEY_ISSUER,
			jti: randomUUID(),
		});
	}
}
