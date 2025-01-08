import { Service } from '@n8n/di';
import type { OpenAPIV3 } from 'openapi-types';

import { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { EventService } from '@/events/event.service';
import type { AuthenticatedRequest } from '@/requests';

import { JwtService } from './jwt.service';

const API_KEY_AUDIENCE = 'public-api';
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 15;
const REDACT_API_KEY_MAX_LENGTH = 80;

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
	async createPublicApiKeyForUser(user: User) {
		const apiKey = this.generateApiKey(user);
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
	 * @returns The redacted API key with a fixed prefix and asterisks replacing the rest of the characters.
	 * @example
	 * ```typescript
	 * const redactedKey = PublicApiKeyService.redactApiKey('12345-abcdef-67890');
	 * console.log(redactedKey); // Output: '12345-*****'
	 * ```
	 */
	redactApiKey(apiKey: string) {
		const visiblePart = apiKey.slice(0, REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(apiKey.length - REDACT_API_KEY_REVEAL_COUNT);

		const completeRedactedApiKey = visiblePart + redactedPart;

		return completeRedactedApiKey.slice(0, REDACT_API_KEY_MAX_LENGTH);
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

	private generateApiKey = (user: User) =>
		this.jwtService.sign({ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE });
}
