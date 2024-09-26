import { randomBytes } from 'node:crypto';
import Container, { Service } from 'typedi';

import { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { UserRepository } from '@/databases/repositories/user.repository';

export const API_KEY_PREFIX = 'n8n_api_';

@Service()
export class PublicApiKeyService {
	constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

	/**
	 * Creates a new public API key for the specified user.
	 * @param user - The user for whom the API key is being created.
	 * @returns A promise that resolves to the newly created API key.
	 */
	async createPublicApiKeyForUser(user: User) {
		const apiKey = this.createApiKeyString();
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

	async getUserForApiKey(apiKey: string) {
		return await Container.get(UserRepository)
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
		const keepLength = 5;
		return (
			API_KEY_PREFIX +
			apiKey.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + keepLength) +
			'*'.repeat(apiKey.length - API_KEY_PREFIX.length - keepLength)
		);
	}

	createApiKeyString = () => `${API_KEY_PREFIX}${randomBytes(40).toString('hex')}`;
}
