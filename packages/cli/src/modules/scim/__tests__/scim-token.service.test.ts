import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { JwtService, UrlService } from '@n8n/backend-services';

import type { ScimToken } from '../database/scim-token.entity';
import type { ScimTokenRepository } from '../database/scim-token.repository';
import { ScimTokenService } from '../scim-token.service';
import { ScimTokenConflictError } from '../scim.errors';

describe('ScimTokenService', () => {
	let scimTokenRepository: Mocked<ScimTokenRepository>;
	let jwtService: Mocked<JwtService>;
	let urlService: Mocked<UrlService>;
	let service: ScimTokenService;

	const user = mock<User>({ id: 'user-1' });

	const createToken = (overrides: Partial<ScimToken> = {}): ScimToken =>
		({
			id: 1,
			slot: 'instance',
			token: 'a-very-long-scim-token-value',
			createdById: 'user-1',
			lastUsedAt: null,
			createdAt: new Date(),
			...overrides,
		}) as ScimToken;

	beforeEach(() => {
		scimTokenRepository = mock<ScimTokenRepository>();
		jwtService = mock<JwtService>();
		urlService = mock<UrlService>();
		jwtService.sign.mockReturnValue('signed-token');
		service = new ScimTokenService(scimTokenRepository, jwtService, urlService);
	});

	describe('verifyApiKey', () => {
		it('accepts a valid token that is the stored instance token', async () => {
			scimTokenRepository.findByToken.mockResolvedValue(createToken());

			await expect(service.verifyApiKey('token')).resolves.toBe(true);

			expect(jwtService.verify).toHaveBeenCalledWith('scimApiKey', 'token', { issuer: 'n8n' });
			expect(scimTokenRepository.findByToken).toHaveBeenCalledWith('token', {});
		});

		it('accepts the token after its creator was deleted', async () => {
			scimTokenRepository.findByToken.mockResolvedValue(createToken({ createdById: null }));

			await expect(service.verifyApiKey('token')).resolves.toBe(true);
		});

		it('rejects a token that fails JWT verification', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
			expect(scimTokenRepository.findByToken).not.toHaveBeenCalled();
		});

		it('rejects a token that is not the stored instance token', async () => {
			scimTokenRepository.findByToken.mockResolvedValue(null);

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			scimTokenRepository.findByToken.mockRejectedValue(new Error('db down'));

			await expect(service.verifyApiKey('token')).rejects.toThrow('db down');
		});
	});

	describe('getTokenInfo', () => {
		it('returns the last four characters of the instance token', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());

			await expect(service.getTokenInfo()).resolves.toEqual({
				hasToken: true,
				lastFour: 'alue',
			});
		});

		it('reports no token when the instance has none', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(null);

			await expect(service.getTokenInfo()).resolves.toEqual({ hasToken: false, lastFour: null });
		});
	});

	describe('rotateToken', () => {
		it('replaces the current token with a token whose subject names no user', async () => {
			const created = createToken({ id: 2, token: 'signed-token' });
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken({ token: 'old-token' }));
			scimTokenRepository.replace.mockResolvedValue(created);

			await expect(service.rotateToken(user)).resolves.toBe(created);

			expect(scimTokenRepository.replace).toHaveBeenCalledWith(
				'old-token',
				'signed-token',
				'user-1',
				{},
			);
			const [purpose, payload] = jwtService.sign.mock.calls[0];
			expect(purpose).toBe('scimApiKey');
			expect(payload).toEqual(
				expect.objectContaining({ sub: 'scim-provisioning', iss: 'n8n', jti: expect.any(String) }),
			);
		});

		it('creates the first token when the instance has none', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(null);

			await service.rotateToken(user);

			expect(scimTokenRepository.replace).toHaveBeenCalledWith(null, 'signed-token', 'user-1', {});
		});

		it('propagates a conflict with a concurrent rotation', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());
			scimTokenRepository.replace.mockRejectedValue(new ScimTokenConflictError());

			await expect(service.rotateToken(user)).rejects.toThrow(ScimTokenConflictError);
		});
	});

	it('revokes the instance token', async () => {
		await service.revokeToken();

		expect(scimTokenRepository.deleteInstanceToken).toHaveBeenCalledWith({});
	});
});
