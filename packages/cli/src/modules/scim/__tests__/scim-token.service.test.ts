import type { ApiKey, User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@n8n/backend-services';

import type { ScimApiKeyRepository } from '../database/scim-api-key.repository';
import { ScimTokenService } from '../scim-token.service';

describe('ScimTokenService', () => {
	let apiKeyRepository: Mocked<ScimApiKeyRepository>;
	let jwtService: Mocked<JwtService>;
	let urlService: Mocked<UrlService>;
	let service: ScimTokenService;

	const createApiKey = (overrides: Partial<ApiKey> = {}): ApiKey =>
		({
			id: 'key-1',
			userId: 'user-1',
			apiKey: 'a-very-long-scim-token-value',
			audience: 'scim-api',
			user: { id: 'user-1', disabled: false } as User,
			...overrides,
		}) as ApiKey;

	beforeEach(() => {
		apiKeyRepository = mock<ScimApiKeyRepository>();
		jwtService = mock<JwtService>();
		urlService = mock<UrlService>();
		service = new ScimTokenService(apiKeyRepository, jwtService, urlService);
	});

	describe('verifyApiKey', () => {
		it('should accept a valid token belonging to an active user', async () => {
			apiKeyRepository.findByKey.mockResolvedValue(createApiKey());

			await expect(service.verifyApiKey('token')).resolves.toBe(true);

			expect(jwtService.verify).toHaveBeenCalledWith('scimApiKey', 'token', { issuer: 'n8n' });
			expect(apiKeyRepository.findByKey).toHaveBeenCalledWith('token', {});
		});

		it('should reject a token that fails JWT verification', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
			expect(apiKeyRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should reject a token that is not stored in the database', async () => {
			apiKeyRepository.findByKey.mockResolvedValue(null);

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			apiKeyRepository.findByKey.mockRejectedValue(new Error('db down'));

			await expect(service.verifyApiKey('token')).rejects.toThrow('db down');
		});

		it('should reject a token whose owner is disabled', async () => {
			apiKeyRepository.findByKey.mockResolvedValue(
				createApiKey({ user: { id: 'user-1', disabled: true } as User }),
			);

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
		});
	});

	describe('findScimApiKeyForUser', () => {
		it('should return the existing key redacted', async () => {
			apiKeyRepository.findByUserId.mockResolvedValue(createApiKey());

			const result = await service.findScimApiKeyForUser(mock<User>({ id: 'user-1' }));

			expect(result?.apiKey).not.toBe('a-very-long-scim-token-value');
			expect(result?.apiKey).toMatch(/^\*+.{4}$/);
		});

		it('should return null when the user has no SCIM token', async () => {
			apiKeyRepository.findByUserId.mockResolvedValue(null);

			expect(await service.findScimApiKeyForUser(mock<User>({ id: 'user-1' }))).toBeNull();
		});
	});
});
