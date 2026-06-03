import { validateToken, TokenValidationError } from '@/index';

import { createTestIssuer } from './helpers/test-issuer';

const ISSUER = 'https://idp.test.local';
const AUDIENCE = 'n8n';

describe('validateToken (JWKS strategy)', () => {
	describe('with a static JWKS', () => {
		it('returns the decoded claims for a valid token', async () => {
			const idp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			const token = await idp.issueToken({ sub: 'user-123', groups: ['admin'] });

			const claims = await validateToken(token, {
				issuer: ISSUER,
				audience: AUDIENCE,
				jwks: idp.jwks,
			});

			expect(claims.sub).toBe('user-123');
			expect(claims.groups).toEqual(['admin']);
			expect(claims.iss).toBe(ISSUER);
		});

		it('rejects an expired token', async () => {
			const idp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			const now = Math.floor(Date.now() / 1000);
			const token = await idp.issueToken(
				{ sub: 'user-123' },
				{ iatSeconds: now - 600, expSeconds: now - 60 },
			);

			await expect(
				validateToken(token, { issuer: ISSUER, audience: AUDIENCE, jwks: idp.jwks }),
			).rejects.toBeInstanceOf(TokenValidationError);
		});

		it('rejects a token from an unexpected issuer', async () => {
			const idp = await createTestIssuer({ issuer: 'https://evil.test.local', audience: AUDIENCE });
			const token = await idp.issueToken({ sub: 'user-123' });

			await expect(
				validateToken(token, { issuer: ISSUER, audience: AUDIENCE, jwks: idp.jwks }),
			).rejects.toBeInstanceOf(TokenValidationError);
		});

		it('rejects a token issued for a different audience', async () => {
			const idp = await createTestIssuer({ issuer: ISSUER, audience: 'some-other-service' });
			const token = await idp.issueToken({ sub: 'user-123' });

			await expect(
				validateToken(token, { issuer: ISSUER, audience: AUDIENCE, jwks: idp.jwks }),
			).rejects.toBeInstanceOf(TokenValidationError);
		});

		it('rejects a token signed by a key not in the JWKS', async () => {
			const realIdp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			const rogueIdp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			const forged = await rogueIdp.issueToken({ sub: 'user-123' });

			// Validate the rogue-signed token against the real issuer's JWKS.
			await expect(
				validateToken(forged, { issuer: ISSUER, audience: AUDIENCE, jwks: realIdp.jwks }),
			).rejects.toBeInstanceOf(TokenValidationError);
		});

		it('rejects a malformed token', async () => {
			const idp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			await expect(
				validateToken('not-a-jwt', { issuer: ISSUER, audience: AUDIENCE, jwks: idp.jwks }),
			).rejects.toBeInstanceOf(TokenValidationError);
		});
	});

	describe('with OIDC discovery', () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('discovers the jwks_uri from the issuer and caches the discovery document', async () => {
			const idp = await createTestIssuer({ issuer: ISSUER, audience: AUDIENCE });
			const token = await idp.issueToken({ sub: 'user-123' });

			const fetchMock = vi.fn(async (input: string | URL) => {
				const url = input.toString();
				if (url.endsWith('/.well-known/openid-configuration')) {
					return new Response(JSON.stringify({ issuer: ISSUER, jwks_uri: `${ISSUER}/jwks` }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					});
				}
				if (url === `${ISSUER}/jwks`) {
					return new Response(JSON.stringify(idp.jwks), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					});
				}
				throw new Error(`unexpected fetch: ${url}`);
			});
			vi.stubGlobal('fetch', fetchMock);

			const first = await validateToken(token, { issuer: ISSUER, audience: AUDIENCE });
			const second = await validateToken(token, { issuer: ISSUER, audience: AUDIENCE });

			expect(first.sub).toBe('user-123');
			expect(second.sub).toBe('user-123');

			const discoveryCalls = fetchMock.mock.calls.filter(([input]: [string | URL]) =>
				input.toString().endsWith('/.well-known/openid-configuration'),
			);
			expect(discoveryCalls).toHaveLength(1);
		});
	});
});
