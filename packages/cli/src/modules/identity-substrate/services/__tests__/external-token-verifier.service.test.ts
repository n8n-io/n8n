import type { Logger } from '@n8n/backend-common';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { InboundAudienceService } from '@/modules/token-exchange/context-establishment-hooks/inbound-audience.service';
import { TokenExchangeAuthError } from '@/modules/token-exchange/token-exchange.errors';
import type { ResolvedTrustedKey } from '@/modules/token-exchange/token-exchange.schemas';

import { ExternalTokenVerifierService } from '../external-token-verifier.service';
import type { JtiStoreService } from '../jti-store.service';
import type { TrustedKeyService } from '../trusted-key.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const trustedKeyStore = mock<TrustedKeyService>();
const jtiStore = mock<JtiStoreService>();
const inboundAudienceService = mock<InboundAudienceService>();

const service = new ExternalTokenVerifierService(
	logger,
	trustedKeyStore,
	jtiStore,
	inboundAudienceService,
);

const resolvedKey: ResolvedTrustedKey = {
	sourceId: 'test-source',
	kid: 'test-kid',
	algorithms: ['RS256'],
	key: 'test-public-key',
	issuer: 'https://issuer.example.com',
	allowedRoles: ['global:member', 'global:admin'],
	requireVerifiedEmail: false,
	subjectClaim: 'sub',
};

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

describe('ExternalTokenVerifierService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
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
				expect.objectContaining({ audience: ['unexpected-audience'] }),
			);
		});

		it("also accepts the source's own inbound audiences on the resource-server path", async () => {
			mockValidToken();
			trustedKeyStore.getByKidAndIss.mockResolvedValue({
				...resolvedKey,
				inboundAudiences: ['n8n-sso-client-id'],
			});

			await service.verifyToken('token', { expectedAudience: 'n8n', consumeJti: false });

			expect(jwt.verify).toHaveBeenCalledWith(
				'token',
				resolvedKey.key,
				expect.objectContaining({ audience: ['n8n', 'n8n-sso-client-id'] }),
			);
		});

		it("keeps the exchange path on the source's expectedAudience alone", async () => {
			mockValidToken();
			jtiStore.consume.mockResolvedValue(true);
			trustedKeyStore.getByKidAndIss.mockResolvedValue({
				...resolvedKey,
				expectedAudience: 'exchange-audience',
				inboundAudiences: ['n8n-sso-client-id'],
			});

			await service.verifyToken('token');

			// An inbound audience must never widen what the exchange endpoint accepts.
			expect(jwt.verify).toHaveBeenCalledWith(
				'token',
				resolvedKey.key,
				expect.objectContaining({ audience: 'exchange-audience' }),
			);
		});

		it('accepts a set of acceptable audiences, passing them through as a tuple to jwt.verify', async () => {
			mockValidToken();

			await service.verifyToken('token', {
				expectedAudience: ['aud-a', 'aud-b'],
				consumeJti: false,
			});

			expect(jwt.verify).toHaveBeenCalledWith(
				'token',
				resolvedKey.key,
				expect.objectContaining({ audience: ['aud-a', 'aud-b'] }),
			);
		});

		it('rejects when consumeJti is false and expectedAudience is an empty array', async () => {
			const verifyTokenUnsafe = service.verifyToken.bind(service) as (
				token: string,
				options?: Record<string, unknown>,
			) => Promise<unknown>;

			await expect(
				verifyTokenUnsafe('token', { expectedAudience: [], consumeJti: false }),
			).rejects.toThrow(TokenExchangeAuthError);
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

		it('throws when token cannot be decoded', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue(null);

			await expect(service.verifyToken('garbage')).rejects.toThrow();
		});

		it('throws when kid is missing from JWT header', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);

			await expect(service.verifyToken('no-kid-token')).rejects.toThrow();
		});

		it('throws when iss is missing from JWT payload', async () => {
			const { iss: _, ...claimsWithoutIss } = validClaims;
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: claimsWithoutIss,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);

			await expect(service.verifyToken('no-iss-token')).rejects.toThrow();
		});

		it('throws when kid is unknown', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'unknown-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(undefined);

			await expect(service.verifyToken('unknown-kid-token')).rejects.toThrow(
				TokenExchangeAuthError,
			);
		});

		it('throws when jwt.verify returns unexpected payload format', async () => {
			vi.spyOn(jwt, 'decode').mockReturnValue({
				header: { alg: 'RS256', kid: 'test-kid' },
				payload: validClaims,
				signature: 'sig',
			} as unknown as ReturnType<typeof jwt.decode>);
			vi.spyOn(jwt, 'verify').mockReturnValue(
				'string-payload' as unknown as ReturnType<typeof jwt.verify>,
			);
			trustedKeyStore.getByKidAndIss.mockResolvedValue(resolvedKey);

			await expect(service.verifyToken('string-payload-token')).rejects.toThrow(
				TokenExchangeAuthError,
			);
		});

		it('throws when token lifetime exceeds the configured maximum', async () => {
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

			await expect(
				service.verifyToken('long-lived-token', { maxLifetimeSeconds: 60 }),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('throws when JTI has already been consumed (replay)', async () => {
			mockValidToken();
			jtiStore.consume.mockResolvedValue(false);

			await expect(service.verifyToken('replayed-token')).rejects.toThrow(TokenExchangeAuthError);
		});

		describe('subjectClaim override', () => {
			it('leaves sub unchanged when subjectClaim is the default', async () => {
				mockValidToken();
				jtiStore.consume.mockResolvedValue(true);

				const result = await service.verifyToken('valid-token');

				expect(result.claims.sub).toBe(validClaims.sub);
			});

			it('substitutes the configured claim for sub when present', async () => {
				const payload = { ...validClaims, uid: 'stable-okta-id' };
				vi.spyOn(jwt, 'decode').mockReturnValue({
					header: { alg: 'RS256', kid: 'test-kid' },
					payload,
					signature: 'sig',
				} as unknown as ReturnType<typeof jwt.decode>);
				vi.spyOn(jwt, 'verify').mockReturnValue(
					payload as unknown as ReturnType<typeof jwt.verify>,
				);
				trustedKeyStore.getByKidAndIss.mockResolvedValue({ ...resolvedKey, subjectClaim: 'uid' });
				jtiStore.consume.mockResolvedValue(true);

				const result = await service.verifyToken('valid-token');

				expect(result.claims.sub).toBe('stable-okta-id');
			});

			it('rejects when the configured claim is missing from the payload', async () => {
				mockValidToken();
				trustedKeyStore.getByKidAndIss.mockResolvedValue({ ...resolvedKey, subjectClaim: 'uid' });

				await expect(service.verifyToken('valid-token')).rejects.toThrow(TokenExchangeAuthError);
			});

			it('rejects when the configured claim is present but not a string', async () => {
				const payload = { ...validClaims, uid: 12345 };
				vi.spyOn(jwt, 'decode').mockReturnValue({
					header: { alg: 'RS256', kid: 'test-kid' },
					payload,
					signature: 'sig',
				} as unknown as ReturnType<typeof jwt.decode>);
				vi.spyOn(jwt, 'verify').mockReturnValue(
					payload as unknown as ReturnType<typeof jwt.verify>,
				);
				trustedKeyStore.getByKidAndIss.mockResolvedValue({ ...resolvedKey, subjectClaim: 'uid' });

				await expect(service.verifyToken('valid-token')).rejects.toThrow(TokenExchangeAuthError);
			});
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
				subjectClaim: 'sub',
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
				// Carried alongside the claim so whoever binds it to an n8n user
				// applies the trust source's own restrictions.
				policy: {
					kid: 'keycloak-kid',
					allowedRoles: undefined,
					requireVerifiedEmail: false,
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

		it('substitutes a configured subjectClaim for sub end-to-end (Okta-style divergence)', async () => {
			const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
			const oktaClaims = {
				sub: 'alice.example@acme.com',
				uid: 'okta-immutable-id-42',
				iss: 'https://acme.okta.com/oauth2/aus1abc',
				aud: 'n8n-resource-server',
				iat: now,
				exp: now + 300,
				jti: 'okta-token-id',
			};
			const token = jwt.sign(oktaClaims, privateKey, { algorithm: 'RS256', keyid: 'okta-kid' });

			trustedKeyStore.getByKidAndIss.mockResolvedValue({
				sourceId: 'okta-custom-as',
				kid: 'okta-kid',
				algorithms: ['RS256'],
				key: publicKey,
				issuer: oktaClaims.iss,
				requireVerifiedEmail: false,
				subjectClaim: 'uid',
			});

			const result = await service.verifyExternalToken(token, oktaClaims.aud);

			expect(result).toMatchObject({ claim: { subject: oktaClaims.uid } });
		});
	});

	describe('verifyInboundToken', () => {
		it('verifies against the audience returned by InboundAudienceService', async () => {
			inboundAudienceService.getExpectedAudience.mockReturnValue('https://n8n.example.com');
			const spy = vi.spyOn(service, 'verifyExternalToken').mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token', errorDetails: 'nope' },
			});

			await service.verifyInboundToken('some-token');

			expect(spy).toHaveBeenCalledWith('some-token', 'https://n8n.example.com');
		});
	});
});
