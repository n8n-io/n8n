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
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;

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
	 */
	async createPublicApiKeyForUser(user: User, { label }: { label: string }) {
		const apiKey = this.generateApiKey(user);
		await this.apiKeyRepository.upsert(
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				label,
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

	async updateApiKeyForUser(user: User, apiKeyId: string, { label }: { label?: string } = {}) {
		await this.apiKeyRepository.update({ id: apiKeyId, userId: user.id }, { label });
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
	 * Redacts an API key by replacing a portion of it with asterisks.
	 *
	 * The function keeps the last `REDACT_API_KEY_REVEAL_COUNT` characters of the API key visible
	 * and replaces the rest with asterisks, up to a maximum length defined by `REDACT_API_KEY_MAX_LENGTH`.
	 *
	 * @example
	 * ```typescript
	 * const redactedKey = PublicApiKeyService.redactApiKey('12345-abcdef-67890');
	 * console.log(redactedKey); // Output: '*****-67890'
	 * ```
	 */
	redactApiKey(apiKey: string) {
		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);

		return redactedPart + visiblePart;
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
