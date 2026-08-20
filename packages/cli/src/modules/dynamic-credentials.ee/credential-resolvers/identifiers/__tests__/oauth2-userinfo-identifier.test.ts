import type { HttpRequestClient, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { JSONWebKeySet, JWTPayload, KeyObject } from 'jose';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';
import { OAuth2UserInfoIdentifier } from '../oauth2-userinfo-identifier';

const ISSUER = 'https://auth.example.com';
const AUDIENCE = 'n8n-client';

describe('OAuth2UserInfoIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();
	let identifier: OAuth2UserInfoIdentifier;

	const validOptions = {
		metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
		subjectClaim: 'sub',
		validation: 'oauth2-userinfo' as const,
	};

	/** Options for the audience-bound path, which is what new resolvers must use. */
	const boundOptions = { ...validOptions, expectedAudience: AUDIENCE };

	const validMetadata = {
		issuer: ISSUER,
		userinfo_endpoint: 'https://auth.example.com/oauth/userinfo',
		jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
	};

	const validUserInfoResponse = {
		sub: 'user-123',
		email: 'user@example.com',
		name: 'Test User',
	};

	const mockContext = {
		identity: 'mock-access-token',
		version: 1 as const,
	};

	let signingKey: KeyObject;
	let jwks: JSONWebKeySet;
	let otherSigningKey: KeyObject;

	beforeAll(async () => {
		const keyPair = await generateKeyPair('RS256');
		signingKey = keyPair.privateKey;
		jwks = { keys: [{ ...(await exportJWK(keyPair.publicKey)), kid: 'test-key', alg: 'RS256' }] };

		const otherKeyPair = await generateKeyPair('RS256');
		otherSigningKey = otherKeyPair.privateKey;
	});

	const signToken = async (claims: JWTPayload, key: KeyObject = signingKey, issuer = ISSUER) =>
		await new SignJWT(claims)
			.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
			.setIssuer(issuer)
			.setIssuedAt()
			.setExpirationTime('1h')
			.sign(key);

	/** Route the single `request` mock by URL, since the verified path fetches JWKS too. */
	const stubEndpoints = (userinfo: unknown = validUserInfoResponse, keySet: unknown = jwks) => {
		request.mockImplementation(async (options: IHttpRequestOptions) => {
			if (options.url === validOptions.metadataUri) {
				return { statusCode: 200, body: validMetadata };
			}
			if (options.url === validMetadata.jwks_uri) return { statusCode: 200, body: keySet };
			if (options.url === validMetadata.userinfo_endpoint) {
				return { statusCode: 200, body: userinfo };
			}
			throw new Error(`Unexpected request to ${String(options.url)}`);
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		const httpClient = new OAuth2MetadataHttpClient(
			logger,
			cache,
			outboundHttp,
			mock<SsrfProtectionService>(),
			mock<SsrfProtectionConfig>({ enabled: true }),
		);
		identifier = new OAuth2UserInfoIdentifier(logger, cache, httpClient);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Happy Path', () => {
		test('should resolve subject successfully', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validUserInfoResponse });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('oauth2-userinfo-identifier:subject'),
				'user-123',
				expect.any(Number),
			);
			// Metadata call is mapped to a plain JSON GET.
			expect(request).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: validOptions.metadataUri,
					method: 'GET',
					json: true,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				}),
			);
			// UserInfo call carries the caller's bearer token.
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://auth.example.com/oauth/userinfo',
					method: 'GET',
					headers: { authorization: 'Bearer mock-access-token' },
					json: true,
				}),
			);
		});

		test('should return cached result on subsequent calls', async () => {
			cache.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-user-123');

			request.mockResolvedValueOnce({ statusCode: 200, body: validMetadata });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('cached-user-123');
			expect(request).toHaveBeenCalledTimes(1); // Only metadata call, no userinfo call
		});

		test('should extract subject from custom claim', async () => {
			const customOptions = { ...validOptions, subjectClaim: 'email' };
			const customResponse = { ...validUserInfoResponse, email: 'john.doe@example.com' };

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: customResponse });

			const result = await identifier.resolve(mockContext, customOptions);

			expect(result).toBe('john.doe@example.com');
		});
	});

	describe('Validation', () => {
		test('should validate successfully with valid options', async () => {
			request.mockResolvedValue({ statusCode: 200, body: validMetadata });

			await expect(identifier.validateOptions(boundOptions)).resolves.toBeUndefined();
		});

		test('should accept options without an expected audience', async () => {
			// Optional by design: without one the resolver stays on the unenforced path.
			request.mockResolvedValue({ statusCode: 200, body: validMetadata });

			await expect(identifier.validateOptions(validOptions)).resolves.toBeUndefined();
		});

		test('should accept a blank expected audience', async () => {
			// The form sends every rendered property, so an untouched field arrives as ''.
			request.mockResolvedValue({ statusCode: 200, body: validMetadata });

			await expect(
				identifier.validateOptions({ ...validOptions, expectedAudience: '   ' }),
			).resolves.toBeUndefined();
		});

		test('should throw IdentifierValidationError when metadata missing userinfo_endpoint', async () => {
			const metadataWithoutUserInfo = {
				issuer: 'https://auth.example.com',
			};

			request.mockResolvedValue({ statusCode: 200, body: metadataWithoutUserInfo });

			await expect(identifier.validateOptions(boundOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.validateOptions(boundOptions)).rejects.toThrow(
				'Invalid OAuth2 metadata format',
			);
		});

		test('should throw IdentifierValidationError when metadata missing jwks_uri', async () => {
			const metadataWithoutJwks = {
				issuer: ISSUER,
				userinfo_endpoint: validMetadata.userinfo_endpoint,
			};

			request.mockResolvedValue({ statusCode: 200, body: metadataWithoutJwks });

			await expect(identifier.validateOptions(boundOptions)).rejects.toThrow(
				'Metadata does not contain a JWKS endpoint',
			);
		});

		test('should not require jwks_uri without an expected audience', async () => {
			// The keys are only reached once verification is switched on.
			const metadataWithoutJwks = {
				issuer: ISSUER,
				userinfo_endpoint: validMetadata.userinfo_endpoint,
			};

			request.mockResolvedValue({ statusCode: 200, body: metadataWithoutJwks });

			await expect(identifier.validateOptions(validOptions)).resolves.toBeUndefined();
		});
	});

	describe('Network Errors', () => {
		test('should throw IdentifierValidationError when metadata URL is unreachable', async () => {
			request.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:443'));

			const error = await identifier.validateOptions(boundOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});

		test('should throw IdentifierValidationError on DNS resolution failure', async () => {
			request.mockRejectedValue(new Error('getaddrinfo ENOTFOUND auth.example.com'));

			const error = await identifier.validateOptions(boundOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});

		test('should throw IdentifierValidationError on request timeout', async () => {
			request.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

			const error = await identifier.validateOptions(boundOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});
	});

	describe('Audience', () => {
		test('should resolve the subject from the verified token without calling UserInfo', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			const result = await identifier.resolve({ ...mockContext, identity: token }, boundOptions);

			expect(result).toBe('user-123');
			const calledUrls = request.mock.calls.map((call) => (call[0] as IHttpRequestOptions).url);
			expect(calledUrls).not.toContain(validMetadata.userinfo_endpoint);
		});

		test('should accept a token whose aud array contains the expected audience', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123', aud: ['other-app', AUDIENCE] });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).resolves.toBe('user-123');
		});

		test('should not accept azp in place of an audience', async () => {
			// `azp` names the client that requested the token, not who it is for. Honouring
			// it would admit a token minted for another application of the same client.
			stubEndpoints();
			const token = await signToken({
				sub: 'user-123',
				aud: 'https://other-service.example.com',
				azp: AUDIENCE,
			});

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Token was not issued for the expected audience');
		});

		test('should reject a token issued for a different party', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123', aud: 'other-app' });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Token was not issued for the expected audience');
		});

		test('should reject a token that declares no audience', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123' });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Token declares no audience');
		});

		test('should reject an opaque access token', async () => {
			stubEndpoints();

			await expect(
				identifier.resolve({ ...mockContext, identity: 'opaque-token' }, boundOptions),
			).rejects.toThrow('Access token is not a JWT');
		});

		test('should reject a token signed by an unknown key', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE }, otherSigningKey);

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Access token verification failed');
		});

		test('should reject a token from a different issuer', async () => {
			stubEndpoints();
			const token = await signToken(
				{ sub: 'user-123', aud: AUDIENCE },
				signingKey,
				'https://evil.example.com',
			);

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Access token verification failed');
		});

		test('should query UserInfo when the configured claim is absent from the token', async () => {
			stubEndpoints();
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			const result = await identifier.resolve(
				{ ...mockContext, identity: token },
				{
					...boundOptions,
					subjectClaim: 'email',
				},
			);

			expect(result).toBe('user@example.com');
			const calledUrls = request.mock.calls.map((call) => (call[0] as IHttpRequestOptions).url);
			expect(calledUrls).toContain(validMetadata.userinfo_endpoint);
		});

		test('should reject when UserInfo describes a different subject than the token', async () => {
			stubEndpoints({ sub: 'someone-else', email: 'other@example.com' });
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			await expect(
				identifier.resolve(
					{ ...mockContext, identity: token },
					{
						...boundOptions,
						subjectClaim: 'email',
					},
				),
			).rejects.toThrow('UserInfo subject does not match the verified access token');
		});

		test('should not reuse a cached subject after expectedAudience changes', async () => {
			stubEndpoints();
			const token = await signToken({
				sub: 'user-123',
				aud: [AUDIENCE, 'https://api.example.com'],
			});
			const context = { ...mockContext, identity: token };

			await identifier.resolve(context, boundOptions);
			const firstKey = cache.set.mock.calls.find((call) => call[0].includes(':subject:'))![0];
			cache.set.mockClear();

			await identifier.resolve(context, {
				...boundOptions,
				expectedAudience: 'https://api.example.com',
			});
			const secondKey = cache.set.mock.calls.find((call) => call[0].includes(':subject:'))![0];

			expect(secondKey).not.toBe(firstKey);
		});
	});

	describe('Key rotation', () => {
		/** A key set that does not contain the key the token was signed with. */
		const staleJwks = { keys: [] };

		test('should refetch the key set when the signing key is unknown', async () => {
			// The issuer publishes the rotated key only on the second fetch.
			let fetches = 0;
			request.mockImplementation(async (options: IHttpRequestOptions) => {
				if (options.url === validOptions.metadataUri) {
					return { statusCode: 200, body: validMetadata };
				}
				if (options.url === validMetadata.jwks_uri) {
					fetches += 1;
					return { statusCode: 200, body: fetches === 1 ? staleJwks : jwks };
				}
				throw new Error(`Unexpected request to ${String(options.url)}`);
			});
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).resolves.toBe('user-123');
			expect(fetches).toBe(2);
		});

		test('should coalesce a concurrent burst into a single key-set refresh', async () => {
			// Every caller sees a stale set, so each one wants to refresh. Reading the
			// cooldown and writing it is not atomic, so without coalescing they all claim
			// it and each hits the issuer.
			request.mockImplementation(async (options: IHttpRequestOptions) => {
				if (options.url === validOptions.metadataUri) {
					return { statusCode: 200, body: validMetadata };
				}
				if (options.url === validMetadata.jwks_uri) return { statusCode: 200, body: staleJwks };
				throw new Error(`Unexpected request to ${String(options.url)}`);
			});
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			await Promise.allSettled(
				Array.from(
					{ length: 5 },
					async () => await identifier.resolve({ ...mockContext, identity: token }, boundOptions),
				),
			);

			const claims = cache.set.mock.calls.filter((call) => call[0].includes(':jwks-refresh:'));
			expect(claims).toHaveLength(1);
		});

		test('should report an audience failure after a rotation as an audience failure', async () => {
			let fetches = 0;
			request.mockImplementation(async (options: IHttpRequestOptions) => {
				if (options.url === validOptions.metadataUri) {
					return { statusCode: 200, body: validMetadata };
				}
				if (options.url === validMetadata.jwks_uri) {
					fetches += 1;
					return { statusCode: 200, body: fetches === 1 ? staleJwks : jwks };
				}
				throw new Error(`Unexpected request to ${String(options.url)}`);
			});
			// Verifies only against the rotated key, but is issued for someone else.
			const token = await signToken({ sub: 'user-123', aud: 'other-app' });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Token was not issued for the expected audience');
		});

		test('should surface a failed refetch as a resolution error', async () => {
			// A raw transport error escaping here would bypass the resolver's error handling.
			let fetches = 0;
			request.mockImplementation(async (options: IHttpRequestOptions) => {
				if (options.url === validOptions.metadataUri) {
					return { statusCode: 200, body: validMetadata };
				}
				if (options.url === validMetadata.jwks_uri) {
					fetches += 1;
					if (fetches === 1) return { statusCode: 200, body: staleJwks };
					throw new Error('connect ECONNREFUSED 127.0.0.1:443');
				}
				throw new Error(`Unexpected request to ${String(options.url)}`);
			});
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			const error = await identifier
				.resolve({ ...mockContext, identity: token }, boundOptions)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(fetches).toBe(2);
		});

		test('should not refetch while the refresh cooldown is held', async () => {
			let fetches = 0;
			request.mockImplementation(async (options: IHttpRequestOptions) => {
				if (options.url === validOptions.metadataUri) {
					return { statusCode: 200, body: validMetadata };
				}
				if (options.url === validMetadata.jwks_uri) {
					fetches += 1;
					return { statusCode: 200, body: staleJwks };
				}
				throw new Error(`Unexpected request to ${String(options.url)}`);
			});
			// Cooldown already claimed, so an unknown key id must not trigger another fetch.
			cache.get.mockImplementation(async (key: string) =>
				key.includes(':jwks-refresh:') ? true : undefined,
			);
			const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

			await expect(
				identifier.resolve({ ...mockContext, identity: token }, boundOptions),
			).rejects.toThrow('Access token verification failed');
			expect(fetches).toBe(1);
		});
	});

	describe('Configuration without an expected audience', () => {
		test('should keep resolving and warn', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validUserInfoResponse });

			await expect(identifier.resolve(mockContext, validOptions)).resolves.toBe('user-123');
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('no expected audience configured'),
				expect.any(Object),
			);
		});
	});

	describe('Critical Errors', () => {
		test('should throw IdentifierValidationError for invalid options', async () => {
			const invalidOptions = { metadataUri: 'not-a-url' };

			await expect(identifier.resolve(mockContext, invalidOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should throw IdentifierValidationError when metadata fetch fails', async () => {
			request.mockResolvedValue({ statusCode: 404, body: {} });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to fetch OAuth2 metadata'),
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Failed to fetch OAuth2 metadata, status code: 404',
			);
		});

		test('should throw IdentifierValidationError when userinfo call fails', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 401, body: { error: 'invalid_token' } });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith('UserInfo failed', expect.any(Object));
		});

		test('should throw IdentifierValidationError when subject claim is missing', async () => {
			const responseWithoutSub = {
				email: 'user@example.com',
				name: 'Test User',
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: responseWithoutSub });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('missing subject claim'));
		});
	});

	describe('TTL Handling', () => {
		test('should use default TTL when exp not provided', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validUserInfoResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(60 * Time.seconds.toMilliseconds);
		});

		test('should cap TTL at MAX_TOKEN_CACHE_TIMEOUT for long-lived token', async () => {
			const longLivedResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: longLivedResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(5 * Time.minutes.toMilliseconds);
		});

		test('should not cache the subject of an expired token', async () => {
			// `resolve` serves a cached subject without re-verifying, so caching a spent
			// token would keep resolving it past its expiry.
			const expiredResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: expiredResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeUndefined();
		});

		test('should not cache a subject for longer than the token has left', async () => {
			const soonToExpire = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) + 5, // shorter than the old 30s floor
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: soonToExpire });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBeLessThanOrEqual(5 * Time.seconds.toMilliseconds);
		});

		test('should calculate correct TTL for token expiring in 2 minutes', async () => {
			const expiringResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: expiringResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			// Should be ~120 seconds, but at least MIN_TOKEN_CACHE_TIMEOUT
			expect(subjectCacheCall![2]).toBeGreaterThanOrEqual(30 * Time.seconds.toMilliseconds);
			expect(subjectCacheCall![2]).toBeLessThanOrEqual(120 * Time.seconds.toMilliseconds);
		});
	});
});
