import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@n8n/backend-services';

import type {
	ScimTokenRepository,
	ScimTokenState,
	StoredScimToken,
} from '../database/scim-token.repository';
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
		lastUsedAt: null,
		...overrides,
	});

	const tokenState = (
		current: StoredScimToken | null,
		previousTokenHashes: string[] = [],
	): ScimTokenState => ({ current, previousTokenHashes });

	beforeEach(() => {
		scimTokenRepository = mock<ScimTokenRepository>();
		urlService = mock<UrlService>();
		service = new ScimTokenService(scimTokenRepository, urlService);
	});

	describe('verifyToken', () => {
		it('accepts the stored instance token', async () => {
			const stored = createToken();
			scimTokenRepository.findTokenState.mockResolvedValue(tokenState(stored));

			await expect(service.verifyToken(validToken)).resolves.toEqual({
				valid: true,
				token: stored,
			});
			expect(scimTokenRepository.findTokenState).toHaveBeenCalledWith({});
		});

		it('accepts the token after its creator was deleted', async () => {
			scimTokenRepository.findTokenState.mockResolvedValue(
				tokenState(createToken({ createdById: 'deleted-user' })),
			);

			await expect(service.verifyToken(validToken)).resolves.toMatchObject({ valid: true });
		});

		it('rejects a well-formed token that the instance did not issue as invalid', async () => {
			scimTokenRepository.findTokenState.mockResolvedValue(tokenState(createToken()));

			await expect(service.verifyToken(otherToken)).resolves.toEqual({
				valid: false,
				reason: 'invalid_token',
			});
		});

		it.each([
			['a rotation replaced', createToken({ tokenHash: hashScimToken(otherToken) })],
			['a revoke removed', null],
		])('rejects a token that %s as superseded', async (_, current) => {
			scimTokenRepository.findTokenState.mockResolvedValue(
				tokenState(current, [hashScimToken('older'), hashScimToken(validToken)]),
			);

			await expect(service.verifyToken(validToken)).resolves.toEqual({
				valid: false,
				reason: 'superseded_token',
			});
		});

		it('rejects a token as invalid when the instance has none', async () => {
			scimTokenRepository.findTokenState.mockResolvedValue(tokenState(null));

			await expect(service.verifyToken(validToken)).resolves.toEqual({
				valid: false,
				reason: 'invalid_token',
			});
		});

		it.each([
			['a JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl'],
			['a token with a wrong prefix', `n8n_api_${'a'.repeat(43)}`],
			['a token that is too short', `n8n_scim_${'a'.repeat(42)}`],
			['a token with a character outside base64url', `n8n_scim_${'a'.repeat(42)}+`],
			['an empty value', ''],
		])('rejects %s as invalid without a database read', async (_, value) => {
			await expect(service.verifyToken(value)).resolves.toEqual({
				valid: false,
				reason: 'invalid_token',
			});
			expect(scimTokenRepository.findTokenState).not.toHaveBeenCalled();
		});

		it('propagates a repository failure instead of reporting an invalid token', async () => {
			scimTokenRepository.findTokenState.mockRejectedValue(new Error('db down'));

			await expect(service.verifyToken(validToken)).rejects.toThrow('db down');
		});
	});

	describe('getTokenInfo', () => {
		it('returns the hint, the dates and the creator of the instance token', async () => {
			scimTokenRepository.findInstanceTokenWithCreator.mockResolvedValue({
				...createToken({
					createdAt: new Date('2026-10-05T10:00:00.000Z'),
					lastUsedAt: new Date('2026-10-06T11:00:00.000Z'),
				}),
				createdBy: mock<User>({ id: 'user-1', firstName: 'Ada', lastName: 'Admin' }),
			});

			await expect(service.getTokenInfo()).resolves.toEqual({
				hasToken: true,
				lastFour: 'wxyz',
				details: {
					createdAt: '2026-10-05T10:00:00.000Z',
					createdBy: { id: 'user-1', firstName: 'Ada', lastName: 'Admin' },
					lastUsedAt: '2026-10-06T11:00:00.000Z',
				},
			});
		});

		it('returns no creator after the creator was deleted and no last use', async () => {
			scimTokenRepository.findInstanceTokenWithCreator.mockResolvedValue({
				...createToken(),
				createdBy: null,
			});

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

	it.each([
		['a token', createToken(), true],
		['no token', null, false],
	])(
		'reports hasToken from the current token when the instance has %s',
		async (_, current, exists) => {
			scimTokenRepository.findInstanceToken.mockResolvedValue(current);

			await expect(service.hasToken()).resolves.toBe(exists);
			expect(scimTokenRepository.findInstanceToken).toHaveBeenCalledWith({});
		},
	);

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
