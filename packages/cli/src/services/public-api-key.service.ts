import { ApplicationError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
import type { OpenAPIV3 } from 'openapi-types';
import { Service } from 'typedi';

import { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { EventService } from '@/events/event.service';
import type { AuthenticatedRequest } from '@/requests';

import { JwtService } from './jwt.service';

const LEGACY_API_KEY_PREFIX = 'n8n_api_';
const API_KEY_AUDIENCE = 'public-api';
const API_KEY_ISSUER = 'n8n';

@Service()
export class PublicApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
		private readonly eventService: EventService,
	) {}

	/**
	 * Creates a new public API key for the specified user.
	 * @param user - The user for whom the API key is being created.
	 * @returns A promise that resolves to the newly created API key.
	 */
	async createPublicApiKeyForUser(user: User, { legacy = false } = {}) {
		const apiKey = legacy ? this.generateLegacyApiKey() : this.generateApiKey(user);
		await this.apiKeyRepository.upsert(
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				label: 'My API Key',
			}),
			['apiKey'],
		);

		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}

	/**
	 * Retrieves and redacts API keys for a given user.
	 * @param user - The user for whom to retrieve and redact API keys.
	 * @returns A promise that resolves to an array of objects containing redacted API keys.
	 */
	async getRedactedApiKeysForUser(user: User) {
		const apiKeys = await this.apiKeyRepository.findBy({ userId: user.id });
		return apiKeys.map((apiKeyRecord) => ({
			...apiKeyRecord,
			apiKey: this.redactApiKey(apiKeyRecord.apiKey),
		}));
	}

	async deleteApiKeyForUser(user: User, apiKeyId: string) {
		await this.apiKeyRepository.delete({ userId: user.id, id: apiKeyId });
	}

	private async getUserForApiKey(apiKey: string) {
		return await this.userRepository
			.createQueryBuilder('user')
			.innerJoin(ApiKey, 'apiKey', 'apiKey.userId = user.id')
			.where('apiKey.apiKey = :apiKey', { apiKey })
			.select('user')
			.getOne();
	}

	/**
	 * Redacts an API key by keeping the first few characters and replacing the rest with asterisks.
	 * @param apiKey - The API key to be redacted. If null, the function returns undefined.
	 * @param revealCount - Number of characters to reveal.
	 * @param maxLength - Maximum length of the redacted API key.
	 * @returns The redacted API key with a fixed prefix and asterisks replacing the rest of the characters.
	 * @example
	 * ```typescript
	 * const redactedKey = PublicApiKeyService.redactApiKey('12345-abcdef-67890');
	 * console.log(redactedKey); // Output: '12345-*****'
	 * ```
	 */
	redactApiKey(apiKey: string, revealCount = 15, maxLength = 80) {
		if (revealCount < 0 || revealCount > apiKey.length) {
			throw new ApplicationError('Invalid reveal count');
		}

		const visiblePart = apiKey.slice(0, revealCount);
		const redactedPart = '*'.repeat(apiKey.length - revealCount);

		const completeRedactedApiKey = visiblePart + redactedPart;

		return completeRedactedApiKey.slice(0, maxLength);
	}

	private isLegacyApiKey(apiKey: string) {
		return apiKey.startsWith(LEGACY_API_KEY_PREFIX);
	}

	private isValidApiKey(apiKey: string) {
		try {
			const { aud } = this.jwtService.verify(apiKey);
			return aud === API_KEY_AUDIENCE;
		} catch {
			return false;
		}
	}

	getAuthMiddleware(version: string) {
		return async (
			req: AuthenticatedRequest,
			_scopes: unknown,
			schema: OpenAPIV3.ApiKeySecurityScheme,
		): Promise<boolean> => {
			const providedApiKey = req.headers[schema.name.toLowerCase()] as string;

			const user = await this.getUserForApiKey(providedApiKey);

			if (!user) return false;

			/*
				Legacy API keys will be deprecated in n8n v2.
				Then we can delete the first check and always validate the API key.
			*/
			if (!this.isLegacyApiKey(providedApiKey) && !this.isValidApiKey(providedApiKey)) {
				return false;
			}

			this.eventService.emit('public-api-invoked', {
				userId: user.id,
				path: req.path,
				method: req.method,
				apiVersion: version,
			});

			req.user = user;

			return true;
		};
	}

	private generateLegacyApiKey = () => `${LEGACY_API_KEY_PREFIX}${randomBytes(40).toString('hex')}`;

	private generateApiKey = (user: User) =>
		this.jwtService.sign({ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE });
}
