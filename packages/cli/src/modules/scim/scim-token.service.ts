import { ApiKey, ApiKeyRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'crypto';
import { ApiKeyAudience } from 'n8n-workflow';

import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';

const API_KEY_AUDIENCE: ApiKeyAudience = 'scim-api';
const API_KEY_ISSUER = 'n8n';
const API_KEY_LABEL = 'SCIM Provisioning API Key';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const REDACT_API_KEY_MIN_HIDDEN_CHARS = 6;

/**
 * Service for managing SCIM API keys, including creation, retrieval, deletion, and authentication.
 */
@Service()
export class ScimTokenService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Create a new SCIM API key for a user
	 */
	async createScimApiKey(user: User, trx?: EntityManager) {
		const manager = trx ?? this.apiKeyRepository.manager;

		const apiKey = this.jwtService.sign({
			sub: user.id,
			iss: API_KEY_ISSUER,
			aud: API_KEY_AUDIENCE,
			jti: randomUUID(),
		});

		const apiKeyEntity = this.apiKeyRepository.create({
			userId: user.id,
			apiKey,
			audience: API_KEY_AUDIENCE,
			scopes: [],
			label: API_KEY_LABEL,
		});

		await manager.insert(ApiKey, apiKeyEntity);

		return await manager.findOneByOrFail(ApiKey, { apiKey });
	}

	/**
	 * Find SCIM API key for a user
	 */
	async findScimApiKeyForUser(user: User, { redact = true } = {}) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: {
				userId: user.id,
				audience: API_KEY_AUDIENCE,
			},
		});

		if (apiKey && redact) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
		}

		return apiKey;
	}

	/**
	 * Verify a SCIM API key
	 */
	async verifyApiKey(apiKey: string): Promise<boolean> {
		try {
			this.jwtService.verify(apiKey, {
				issuer: API_KEY_ISSUER,
				audience: API_KEY_AUDIENCE,
			});

			const key = await this.apiKeyRepository.findOne({
				where: {
					apiKey,
					audience: API_KEY_AUDIENCE,
				},
			});

			return !!key;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Delete all SCIM API keys for a user
	 */
	async deleteAllScimApiKeysForUser(user: User, trx?: EntityManager) {
		const manager = trx ?? this.apiKeyRepository.manager;

		await manager.delete(ApiKey, {
			userId: user.id,
			audience: API_KEY_AUDIENCE,
		});
	}

	/**
	 * Get or create SCIM API key for a user
	 */
	async getOrCreateApiKey(user: User) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: {
				userId: user.id,
				audience: API_KEY_AUDIENCE,
			},
		});

		if (apiKey) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
			return apiKey;
		}

		return await this.createScimApiKey(user);
	}

	/**
	 * Rotate SCIM API key for a user
	 */
	async rotateScimApiKey(user: User) {
		return await this.apiKeyRepository.manager.transaction(async (trx) => {
			await this.deleteAllScimApiKeysForUser(user, trx);
			return await this.createScimApiKey(user, trx);
		});
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
