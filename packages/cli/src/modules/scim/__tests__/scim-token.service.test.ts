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

	describe('verifyToken', () => {
		it('accepts a valid token that is the stored instance token', async () => {
			const stored = createToken();
			scimTokenRepository.findByToken.mockResolvedValue(stored);

			await expect(service.verifyToken('token')).resolves.toEqual({ valid: true, token: stored });

			expect(jwtService.verify).toHaveBeenCalledWith('scimApiKey', 'token', { issuer: 'n8n' });
			expect(scimTokenRepository.findByToken).toHaveBeenCalledWith('token', {});
		});

		it('accepts the token after its creator was deleted', async () => {
			scimTokenRepository.findByToken.mockResolvedValue(createToken({ createdById: null }));

			await expect(service.verifyToken('token')).resolves.toMatchObject({ valid: true });
		});

		it('rejects a token that fails JWT verification as invalid', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			await expect(service.verifyToken('token')).resolves.toEqual({
				valid: false,
				reason: 'invalid_token',
			});
			expect(scimTokenRepository.findByToken).not.toHaveBeenCalled();
		});

		it('rejects a signed SCIM token that is not the stored token as superseded', async () => {
			scimTokenRepository.findByToken.mockResolvedValue(null);

			await expect(service.verifyToken('token')).resolves.toEqual({
				valid: false,
				reason: 'superseded_token',
			});
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			scimTokenRepository.findByToken.mockRejectedValue(new Error('db down'));

			await expect(service.verifyToken('token')).rejects.toThrow('db down');
		});
	});

	describe('getTokenInfo', () => {
		it('returns the hint, the dates and the creator of the instance token', async () => {
			scimTokenRepository.findInstanceTokenWithCreator.mockResolvedValue(
				createToken({
					createdAt: new Date('2026-10-05T10:00:00.000Z'),
					lastUsedAt: new Date('2026-10-06T11:00:00.000Z'),
					createdBy: mock<User>({ id: 'user-1', firstName: 'Ada', lastName: 'Admin' }),
				}),
			);

			await expect(service.getTokenInfo()).resolves.toEqual({
				hasToken: true,
				lastFour: 'alue',
				details: {
					createdAt: '2026-10-05T10:00:00.000Z',
					createdBy: { id: 'user-1', firstName: 'Ada', lastName: 'Admin' },
					lastUsedAt: '2026-10-06T11:00:00.000Z',
				},
			});
		});

		it('returns no creator after the creator was deleted and no last use', async () => {
			scimTokenRepository.findInstanceTokenWithCreator.mockResolvedValue(
				createToken({ createdById: null, createdBy: null }),
			);

			await expect(service.getTokenInfo()).resolves.toMatchObject({
				details: { createdBy: null, lastUsedAt: null },
			});
		});

		it('reports no token when the instance has none', async () => {
			scimTokenRepository.findInstanceTokenWithCreator.mockResolvedValue(null);

			await expect(service.getTokenInfo()).resolves.toEqual({
				hasToken: false,
				lastFour: null,
				details: null,
			});
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
