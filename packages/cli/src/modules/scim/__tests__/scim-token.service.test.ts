import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { JwtService, UrlService } from '@n8n/backend-services';

import type { ScimToken } from '../database/scim-token.entity';
import type { ScimTokenRepository } from '../database/scim-token.repository';
import { hashScimToken, ScimTokenService } from '../scim-token.service';
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
			tokenHash: hashScimToken('a-very-long-scim-token-value'),
			tokenHint: 'alue',
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
			scimTokenRepository.findByTokenHash.mockResolvedValue(createToken());

			await expect(service.verifyApiKey('token')).resolves.toBe(true);

			expect(jwtService.verify).toHaveBeenCalledWith('scimApiKey', 'token', { issuer: 'n8n' });
			// The database keeps only the hash of the token.
			expect(scimTokenRepository.findByTokenHash).toHaveBeenCalledWith(hashScimToken('token'), {});
		});

		it('accepts the token after its creator was deleted', async () => {
			scimTokenRepository.findByTokenHash.mockResolvedValue(createToken({ createdById: null }));

			await expect(service.verifyApiKey('token')).resolves.toBe(true);
		});

		it('rejects a token that fails JWT verification', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
			expect(scimTokenRepository.findByTokenHash).not.toHaveBeenCalled();
		});

		it('rejects a token that is not the stored instance token', async () => {
			scimTokenRepository.findByTokenHash.mockResolvedValue(null);

			await expect(service.verifyApiKey('token')).resolves.toBe(false);
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			scimTokenRepository.findByTokenHash.mockRejectedValue(new Error('db down'));

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

	it('stores no token value, only a hex SHA-256 hash', () => {
		// The SHA-256 digest of 'token', from `printf token | shasum -a 256`.
		expect(hashScimToken('token')).toBe(
			'3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0',
		);
		expect(hashScimToken('token-a')).not.toBe(hashScimToken('token-b'));
	});

	describe('rotateToken', () => {
		it('replaces the current token with a token whose subject names no user', async () => {
			jwtService.sign.mockReturnValue('signed-token-wxyz');
			scimTokenRepository.findInstanceToken.mockResolvedValue(
				createToken({ tokenHash: hashScimToken('old-token') }),
			);

			// The value leaves the service only here, once.
			await expect(service.rotateToken(user)).resolves.toBe('signed-token-wxyz');

			expect(scimTokenRepository.replace).toHaveBeenCalledWith(
				hashScimToken('old-token'),
				{
					tokenHash: hashScimToken('signed-token-wxyz'),
					tokenHint: 'wxyz',
					createdById: 'user-1',
				},
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

			expect(scimTokenRepository.replace).toHaveBeenCalledWith(
				null,
				expect.objectContaining({ tokenHash: hashScimToken('signed-token') }),
				{},
			);
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
