import { type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@n8n/backend-services';

import { ScimApiKeyRepository } from './database/scim-api-key.repository';

const API_KEY_PURPOSE = 'scimApiKey' as const;
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const REDACT_API_KEY_MIN_HIDDEN_CHARS = 6;

/**
 * Service for managing SCIM API keys, including creation, retrieval, deletion, and authentication.
 */
@Service()
export class ScimTokenService {
	constructor(
		private readonly apiKeyRepository: ScimApiKeyRepository,
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
	) {}

	private signApiKey(user: User) {
		return this.jwtService.sign(API_KEY_PURPOSE, {
			sub: user.id,
			iss: API_KEY_ISSUER,
			jti: randomUUID(),
		});
	}

	/**
	 * Whether the user has a SCIM token and, if so, its last four
	 * characters for display. The full value is never exposed here.
	 */
	async getTokenInfoForUser(
		user: User,
		ctx: OperationContext = {},
	): Promise<{ hasToken: boolean; lastFour: string | null }> {
		const apiKey = await this.apiKeyRepository.findByUserId(user.id, ctx);

		return {
			hasToken: !!apiKey,
			lastFour: apiKey ? apiKey.apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT) : null,
		};
	}

	/**
	 * Find SCIM API key for a user
	 */
	async findScimApiKeyForUser(user: User, { redact = true } = {}, ctx: OperationContext = {}) {
		const apiKey = await this.apiKeyRepository.findByUserId(user.id, ctx);

		if (apiKey && redact) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
		}

		return apiKey;
	}

	/**
	 * Verify a SCIM API key. The key must be a valid JWT, exist in the
	 * database, and belong to a user that still exists and is not disabled.
	 */
	async verifyApiKey(apiKey: string, ctx: OperationContext = {}): Promise<boolean> {
		try {
			this.jwtService.verify(API_KEY_PURPOSE, apiKey, { issuer: API_KEY_ISSUER });
		} catch {
			// A malformed, expired or wrongly-audienced token is simply not valid.
			return false;
		}

		// Everything below can only fail for reasons that are not the caller's
		// fault, so let those propagate. Reporting a database outage as an
		// invalid token would tell the IdP to treat its credential as revoked.
		const key = await this.apiKeyRepository.findByKey(apiKey, ctx);

		return !!key && !!key.user && !key.user.disabled;
	}

	/**
	 * Delete all SCIM API keys for a user
	 */
	async deleteAllScimApiKeysForUser(user: User, ctx: OperationContext = {}) {
		await this.apiKeyRepository.deleteAllForUser(user.id, ctx);
	}

	/**
	 * Rotate SCIM API key for a user
	 */
	async rotateScimApiKey(user: User, ctx: OperationContext = {}) {
		return await this.apiKeyRepository.replaceForUser(user.id, this.signApiKey(user), ctx);
	}

	/**
	 * Get SCIM base URL
	 */
	getScimBaseUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}/scim/v2`;
	}

	/**
	 * Redact API key for display purposes
	 */
	private redactApiKey(apiKey: string) {
		if (REDACT_API_KEY_REVEAL_COUNT >= apiKey.length - REDACT_API_KEY_MIN_HIDDEN_CHARS) {
			return '*'.repeat(apiKey.length);
		}

		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);

		return redactedPart + visiblePart;
	}
}
