import type { Logger } from '@n8n/backend-common';
import { GLOBAL_MEMBER_ROLE, type User } from '@n8n/db';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { JwtService } from '@/services/jwt.service';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import { TokenExchangeAuthError } from '../../token-exchange.errors';
import type { ResolvedTrustedKey } from '../../token-exchange.schemas';
import type { IdentityResolutionService } from '../identity-resolution.service';
import type { JtiStoreService } from '../jti-store.service';
import { TokenExchangeService } from '../token-exchange.service';
import type { TrustedKeyService } from '../trusted-key.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const trustedKeyStore = mock<TrustedKeyService>();
const jtiStore = mock<JtiStoreService>();
const identityResolutionService = mock<IdentityResolutionService>();
const config = mock<TokenExchangeConfig>();
const jwtService = mock<JwtService>();

const service = new TokenExchangeService(
	logger,
	trustedKeyStore,
	jtiStore,
	identityResolutionService,
	config,
	jwtService,
);

const resolvedKey: ResolvedTrustedKey = {
	sourceId: 'test-source',
	kid: 'test-kid',
	algorithms: ['RS256'],
	key: 'test-public-key',
	issuer: 'https://issuer.example.com',
	allowedRoles: ['global:member', 'global:admin'],
	requireVerifiedEmail: false,
};

const mockUser = mock<User>({
	id: '123',
	email: 'user@example.com',
	role: GLOBAL_MEMBER_ROLE,
});

const now = Math.floor(Date.now() / 1000);
const validClaims = {
	sub: 'external-user-1',
	iss: 'https://issuer.example.com',
	aud: 'n8n',
	iat: now,
	exp: now + 30,
	jti: 'unique-jti-1',
	email: 'user@example.com',
};

describe('TokenExchangeService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe('embedLogin', () => {
		it('should return user on valid token', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				validClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);
			jtiStore.consume.mockResolvedValue(true);
			identityResolutionService.resolve.mockResolvedValue(mockUser);

			const result = await service.embedLogin('valid-token');

			expect(result).toEqual({
				user: mockUser,
				subject: 'external-user-1',
				issuer: 'https://issuer.example.com',
				kid: 'test-kid',
			});
			expect(trustedKeyStore.getByKidAndIss).toHaveBeenCalledWith(
				'test-kid',
				'https://issuer.example.com',
			);
			expect(jtiStore.consume).toHaveBeenCalledWith(
				'unique-jti-1',
				new Date(validClaims.exp * 1000),
			);
			expect(identityResolutionService.resolve).toHaveBeenCalledWith(
				validClaims,
				resolvedKey.allowedRoles,
				{
					kid: resolvedKey.kid,
					issuer: resolvedKey.issuer,
					requireVerifiedEmail: resolvedKey.requireVerifiedEmail,
				},
				true,
			);
		});

		it('should throw when token cannot be decoded', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue(null);

			await expect(service.embedLogin('garbage')).rejects.toThrow(BadRequestError);
		});

		it('should throw when kid is missing from JWT header', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);

			await expect(service.embedLogin('no-kid-token')).rejects.toThrow(BadRequestError);
		});

		it('should throw when iss is missing from JWT payload', async () => {
			const { iss: _, ...claimsWithoutIss } = validClaims;
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: claimsWithoutIss,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);

			await expect(service.embedLogin('no-iss-token')).rejects.toThrow(BadRequestError);
		});

		it('should throw when kid is unknown', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'unknown-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(undefined);

			await expect(service.embedLogin('unknown-kid-token')).rejects.toThrow(AuthError);
		});

		it('should throw when jwt.verify returns unexpected payload format', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				'string-payload' as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			await expect(service.embedLogin('string-payload-token')).rejects.toThrow(AuthError);
		});

		it('should throw when JWT signature verification fails', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockImplementation(() => {
				throw new Error('invalid signature');
			});
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			await expect(service.embedLogin('bad-sig-token')).rejects.toThrow(AuthError);
		});

		it('should throw when claims fail Zod validation', async () => {
			const invalidClaims = { ...validClaims, sub: '' };
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: invalidClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				invalidClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			await expect(service.embedLogin('invalid-claims-token')).rejects.toThrow();
		});

		it('should throw when token lifetime exceeds 60 seconds', async () => {
			const longLivedClaims = { ...validClaims, iat: now, exp: now + 120 };
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: longLivedClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				longLivedClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			await expect(service.embedLogin('long-lived-token')).rejects.toThrow(AuthError);
		});

		it('should throw when JTI has already been consumed (replay)', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				validClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);
			jtiStore.consume.mockResolvedValue(false);

			await expect(service.embedLogin('replayed-token')).rejects.toThrow(AuthError);
		});

		it('should propagate error from IdentityResolutionService', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				validClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);
			jtiStore.consume.mockResolvedValue(true);
			identityResolutionService.resolve.mockRejectedValue(new Error('User not found'));

			await expect(service.embedLogin('token')).rejects.toThrow('User not found');
		});
	});

	describe('verifyToken', () => {
		const mockValidToken = () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				validClaims as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);
		};

		it('defaults consume the jti and honour the source-level audience', async () => {
			mockValidToken();
			jtiStore.consume.mockResolvedValue(true);

			await service.verifyToken('valid-token');

			expect(jwt.verify).toHaveBeenCalledWith(
				'valid-token',
				resolvedKey.key,
				expect.objectContaining({ audience: resolvedKey.expectedAudience }),
			);
			expect(jtiStore.consume).toHaveBeenCalledWith(
				validClaims.jti,
				new Date(validClaims.exp * 1000),
			);
		});

		it('rejects when consumeJti is false and no expectedAudience is supplied', async () => {
			// The overload signatures require `expectedAudience` whenever `consumeJti: false`
			// is passed; bypass that compile-time guard to exercise the runtime fail-closed
			// check, since it also protects callers whose audience is only optional at runtime
			// (e.g. sourced from config).
			const verifyTokenUnsafe = service.verifyToken.bind(service) as (
				token: string,
				options?: Record<string, unknown>,
			) => Promise<unknown>;

			await expect(verifyTokenUnsafe('token', { consumeJti: false })).rejects.toThrow(
				TokenExchangeAuthError,
			);
		});

		it('rejects when the token audience does not match the supplied expectedAudience', async () => {
			mockValidToken();
			vi.spyOn(jwt, 'verify').mockImplementation(() => {
				throw new Error('jwt audience invalid');
			});

			await expect(
				service.verifyToken('token', {
					expectedAudience: 'unexpected-audience',
					consumeJti: false,
				}),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(jwt.verify).toHaveBeenCalledWith(
				'token',
				resolvedKey.key,
				expect.objectContaining({ audience: 'unexpected-audience' }),
			);
		});

		it('verifies the same token twice when consumeJti is false', async () => {
			mockValidToken();

			await service.verifyToken('token', {
				expectedAudience: 'n8n',
				consumeJti: false,
			});
			await service.verifyToken('token', {
				expectedAudience: 'n8n',
				consumeJti: false,
			});

			expect(jtiStore.consume).not.toHaveBeenCalled();
		});

		it('accepts a token without jti when requireJti is false', async () => {
			const { jti: _, ...claimsWithoutJti } = validClaims;
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: claimsWithoutJti,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				claimsWithoutJti as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			const result = await service.verifyToken('token', {
				expectedAudience: 'n8n',
				consumeJti: false,
				requireJti: false,
			});

			expect(result.claims.jti).toBeUndefined();
			expect(jtiStore.consume).not.toHaveBeenCalled();
		});
	});

	describe('verifyExternalToken', () => {
		it('verifies a Keycloak-issued token end-to-end and returns attested claims', async () => {
			const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
			const keycloakClaims = {
				sub: 'a1b2c3d4-keycloak-subject',
				iss: 'https://keycloak.example.com/realms/n8n',
				aud: 'n8n-resource-server',
				iat: now,
				exp: now + 300,
				jti: 'keycloak-token-id',
				email: 'user@example.com',
				email_verified: true,
				given_name: 'Ada',
				family_name: 'Lovelace',
			};
			const token = jwt.sign(keycloakClaims, privateKey, {
				algorithm: 'RS256',
				keyid: 'keycloak-kid',
			});

			trustedKeyStore.getByKidAndIss.mockResolvedValue({
				sourceId: 'keycloak-realm',
				kid: 'keycloak-kid',
				algorithms: ['RS256'],
				key: publicKey,
				issuer: keycloakClaims.iss,
				requireVerifiedEmail: false,
			});

			const result = await service.verifyExternalToken(token, keycloakClaims.aud);

			expect(result).toEqual({
				claim: {
					sourceId: 'keycloak-realm',
					issuer: keycloakClaims.iss,
					subject: keycloakClaims.sub,
					audience: keycloakClaims.aud,
					attributes: {
						email: keycloakClaims.email,
						email_verified: true,
						given_name: 'Ada',
						family_name: 'Lovelace',
					},
					expiresAt: new Date(keycloakClaims.exp * 1000),
				},
			});
			expect(jtiStore.consume).not.toHaveBeenCalled();
		});

		it('returns a typed context instead of throwing when verification fails', async () => {
			await expect(service.verifyExternalToken('garbage-token', 'n8n')).resolves.toEqual({
				claim: null,
				context: { reason: 'invalid_token', errorDetails: expect.any(String) },
			});
		});
	});
});
