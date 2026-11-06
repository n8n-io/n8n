import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@n8n/backend-services';

import type { ScimTokenRepository, StoredScimToken } from '../database/scim-token.repository';
import { hashScimToken, ScimTokenService } from '../scim-token.service';
import { ScimTokenConflictError } from '../scim.errors';

const TOKEN_FORMAT = /^n8n_scim_[\w-]{43}$/;

describe('ScimTokenService', () => {
	let scimTokenRepository: Mocked<ScimTokenRepository>;
	let urlService: Mocked<UrlService>;
	let service: ScimTokenService;

	const user = mock<User>({ id: 'user-1' });
	const validToken = `n8n_scim_${'a'.repeat(39)}wxyz`;
	const otherToken = `n8n_scim_${'b'.repeat(43)}`;

	const createToken = (overrides: Partial<StoredScimToken> = {}): StoredScimToken => ({
		tokenHash: hashScimToken(validToken),
		tokenHint: 'wxyz',
		createdById: 'user-1',
		createdAt: new Date(),
		...overrides,
	});

	beforeEach(() => {
		scimTokenRepository = mock<ScimTokenRepository>();
		urlService = mock<UrlService>();
		service = new ScimTokenService(scimTokenRepository, urlService);
	});

	describe('verifyApiKey', () => {
		it('accepts the stored instance token', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());

			await expect(service.verifyApiKey(validToken)).resolves.toBe(true);
			expect(scimTokenRepository.findInstanceToken).toHaveBeenCalledWith({});
		});

		it('accepts the token after its creator was deleted', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(
				createToken({ createdById: 'deleted-user' }),
			);

			await expect(service.verifyApiKey(validToken)).resolves.toBe(true);
		});

		it('rejects a well-formed token that is not the stored instance token', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());

			await expect(service.verifyApiKey(otherToken)).resolves.toBe(false);
		});

		it('rejects a token when the instance has none', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(null);

			await expect(service.verifyApiKey(validToken)).resolves.toBe(false);
		});

		it.each([
			['a JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl'],
			['a token with a wrong prefix', `n8n_api_${'a'.repeat(43)}`],
			['a token that is too short', `n8n_scim_${'a'.repeat(42)}`],
			['a token with a character outside base64url', `n8n_scim_${'a'.repeat(42)}+`],
			['an empty value', ''],
		])('rejects %s without a database read', async (_, value) => {
			await expect(service.verifyApiKey(value)).resolves.toBe(false);
			expect(scimTokenRepository.findInstanceToken).not.toHaveBeenCalled();
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			scimTokenRepository.findInstanceToken.mockRejectedValue(new Error('db down'));

			await expect(service.verifyApiKey(validToken)).rejects.toThrow('db down');
		});
	});

	describe('getTokenInfo', () => {
		it('returns the last four characters of the instance token', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());

			await expect(service.getTokenInfo()).resolves.toEqual({
				hasToken: true,
				lastFour: 'wxyz',
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
		it('replaces the current token with a new random token', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(
				createToken({ tokenHash: hashScimToken('old-token') }),
			);

			// The value leaves the service only here, once.
			const token = await service.rotateToken(user);

			expect(token).toMatch(TOKEN_FORMAT);
			expect(scimTokenRepository.replace).toHaveBeenCalledWith(
				hashScimToken('old-token'),
				{
					tokenHash: hashScimToken(token),
					tokenHint: token.slice(-4),
					createdById: 'user-1',
					createdAt: expect.any(Date),
				},
				{},
			);
			// The repository gets the hash and the hint, never the token.
			expect(JSON.stringify(scimTokenRepository.replace.mock.calls)).not.toContain(token);
		});

		it('creates the first token when the instance has none', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(null);

			await service.rotateToken(user);

			expect(scimTokenRepository.replace).toHaveBeenCalledWith(
				null,
				expect.objectContaining({ createdById: 'user-1' }),
				{},
			);
		});

		it('creates a different token on each call', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(null);

			const tokens = new Set([
				await service.rotateToken(user),
				await service.rotateToken(user),
				await service.rotateToken(user),
			]);

			expect(tokens.size).toBe(3);
		});

		it('propagates a conflict with a concurrent rotation', async () => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(createToken());
			scimTokenRepository.replace.mockRejectedValue(new ScimTokenConflictError());

			await expect(service.rotateToken(user)).rejects.toThrow(ScimTokenConflictError);
		});
	});

	it('revokes the instance token', async () => {
		await service.revokeToken();

		expect(scimTokenRepository.revokeInstanceToken).toHaveBeenCalledWith({});
	});
});
