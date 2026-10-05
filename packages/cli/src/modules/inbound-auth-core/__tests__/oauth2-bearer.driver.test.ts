import type { Logger } from '@n8n/backend-common';
import {
	JwkSchema,
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type Extracted,
	type Jwk,
	type Result,
	type SurfaceId,
	type TrustedSource,
	type TrustedSourceStore,
} from '@n8n/inbound-auth';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWTHeaderParameters, JWTPayload } from 'jose';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { Oauth2BearerDriver } from '../oauth2-bearer.driver';

const ISSUER = 'https://idp.example';
const RESOURCE = 'https://n8n.example/mcp';
const SURFACE: SurfaceId = 'instance-mcp';
const HEADER: JWTHeaderParameters = { alg: 'ES256', kid: 'k1', typ: 'at+jwt' };

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let jwk: Jwk;

const now = () => Math.floor(Date.now() / 1000);

/** Signs `iss`, `sub`, `aud`, `iat` and `exp` defaults merged with `claims`; `undefined` removes a claim. */
async function sign(claims: JWTPayload = {}, header = HEADER, key = privateKey) {
	const iat = now();
	const merged: JWTPayload = {
		iss: ISSUER,
		sub: 'alice',
		aud: RESOURCE,
		iat,
		exp: iat + 3600,
		...claims,
	};
	const payload = Object.fromEntries(
		Object.entries(merged).filter(([, value]) => value !== undefined),
	);
	return await new SignJWT(payload).setProtectedHeader(header).sign(key);
}

type SourceOverrides = Partial<Omit<TrustedSource, 'config'>> & {
	authentication?: Record<string, unknown>;
	surfaces?: Partial<Record<SurfaceId, { audiences?: string[] }>>;
};

let counter = 0;

function source(overrides: SourceOverrides = {}): TrustedSource {
	const { authentication = {}, surfaces = { [SURFACE]: {} }, ...rest } = overrides;
	counter += 1;
	return {
		id: `source-${counter}`,
		name: `Source ${counter}`,
		type: 'oauth2',
		issuer: ISSUER,
		managedBy: 'admin',
		status: 'healthy',
		lastError: null,
		lastCheckedAt: '2026-10-01T12:00:00.000Z',
		createdAt: '2026-09-30T10:00:00.000Z',
		updatedAt: '2026-10-01T12:00:00.000Z',
		config: migrateToLatest(
			trustedSourceConfigSchemaFor('admin').parse({
				version: 1,
				authentication: { type: 'oauth2', ...authentication },
				surfaces,
			}),
		),
		metadata: {
			version: 1,
			documents: [
				{
					kind: 'jwks',
					fetchedAt: '2026-10-01T12:00:00.000Z',
					url: `${ISSUER}/keys`,
					keys: [jwk],
				},
			],
		},
		...rest,
	};
}

const extracted = (token: string): Extracted => ({
	surface: SURFACE,
	resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
	request: {
		method: 'POST',
		url: '/mcp',
		headers: { authorization: 'Bearer x' },
		ip: '203.0.113.7',
	},
	receivedAt: new Date(),
	credential: { kind: 'bearer', token },
});

function ok<T>(result: Result<T>): T {
	if (!result.ok) throw new Error(`expected ok, got ${result.reason}: ${result.detail ?? ''}`);
	return result.value;
}

let store: MockProxy<TrustedSourceStore>;
let driver: Oauth2BearerDriver;

beforeAll(async () => {
	const pair = await generateKeyPair('ES256');
	privateKey = pair.privateKey;
	jwk = JwkSchema.parse({
		...(await exportJWK(pair.publicKey)),
		kid: 'k1',
		alg: 'ES256',
		use: 'sig',
	});
	otherPrivateKey = (await generateKeyPair('ES256')).privateKey;
});

beforeEach(() => {
	store = mock<TrustedSourceStore>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	driver = new Oauth2BearerDriver(store, logger);
});

describe('Oauth2BearerDriver', () => {
	it('declares the bearer kind and the oauth2 source type', () => {
		expect(driver.credentialKind).toBe('bearer');
		expect(driver.sourceTypes).toEqual(['oauth2']);
	});

	describe('selectSource', () => {
		it('looks the source up by the token issuer', async () => {
			const src = source();
			store.getByIssuer.mockResolvedValue(src);

			const selected = await driver.selectSource(extracted(await sign()));

			expect(selected).toBe(src);
			expect(store.getByIssuer).toHaveBeenCalledWith(ISSUER);
		});

		it('returns undefined for a bearer that is not a JWT without reading the store', async () => {
			expect(await driver.selectSource(extracted('not-a-jwt'))).toBeUndefined();
			expect(store.getByIssuer).not.toHaveBeenCalled();
		});

		it('returns undefined for a JWT without iss without reading the store', async () => {
			const token = await sign({ iss: undefined });

			expect(await driver.selectSource(extracted(token))).toBeUndefined();
			expect(store.getByIssuer).not.toHaveBeenCalled();
		});
	});

	describe('verify', () => {
		const verify = async (token: string, src = source()) =>
			await driver.verify(extracted(token), src);

		it('accepts a valid access token and strips the credential and the headers', async () => {
			const src = source();
			const iat = now();
			const exp = iat + 3600;

			const value = ok(await verify(await sign({ iat, exp }), src));

			expect(value.source).toBe(src);
			expect(value.credentialKind).toBe('bearer');
			expect(value.claims.sub).toBe('alice');
			expect(value.expiresAt).toEqual(new Date(exp * 1000));
			expect(value).not.toHaveProperty('credential');
			expect(value.request).not.toHaveProperty('headers');
			expect(value.request).toMatchObject({ method: 'POST', url: '/mcp', ip: '203.0.113.7' });
		});

		describe('typ header', () => {
			it('accepts the application/ prefixed access token type', async () => {
				const token = await sign({}, { ...HEADER, typ: 'application/at+jwt' });

				expect(await verify(token)).toMatchObject({ ok: true });
			});

			it.each([
				['typ JWT', { ...HEADER, typ: 'JWT' }],
				['no typ', { alg: 'ES256', kid: 'k1' }],
			])('rejects a token with %s as not an access token', async (_name, header) => {
				const token = await sign({}, header);

				expect(await verify(token)).toMatchObject({ ok: false, reason: 'not-an-access-token' });
			});
		});

		describe('signature and key selection', () => {
			it('rejects a token signed with another key', async () => {
				const token = await sign({}, HEADER, otherPrivateKey);

				expect(await verify(token)).toMatchObject({ ok: false, reason: 'signature-invalid' });
			});

			it('rejects an unknown kid', async () => {
				const token = await sign({}, { ...HEADER, kid: 'k2' });

				expect(await verify(token)).toMatchObject({ ok: false, reason: 'signature-invalid' });
			});

			it('rejects an unsigned token (alg none)', async () => {
				const encode = (part: unknown) => Buffer.from(JSON.stringify(part)).toString('base64url');
				const iat = now();
				const token = `${encode({ alg: 'none', typ: 'at+jwt' })}.${encode({
					iss: ISSUER,
					sub: 'alice',
					aud: RESOURCE,
					iat,
					exp: iat + 3600,
				})}.`;

				expect(await verify(token)).toMatchObject({ ok: false, reason: 'signature-invalid' });
			});

			it('rejects a token with a symmetric algorithm', async () => {
				const iat = now();
				const token = await new SignJWT({
					iss: ISSUER,
					sub: 'alice',
					aud: RESOURCE,
					iat,
					exp: iat + 3600,
				})
					.setProtectedHeader({ alg: 'HS256', kid: 'k1', typ: 'at+jwt' })
					.sign(new Uint8Array(32));

				expect(await verify(token)).toMatchObject({ ok: false, reason: 'signature-invalid' });
			});

			it('rejects an algorithm the source does not allow', async () => {
				const src = source({ authentication: { algorithms: ['RS256'] } });

				expect(await verify(await sign(), src)).toMatchObject({
					ok: false,
					reason: 'signature-invalid',
				});
			});
		});

		describe('time claims', () => {
			it.each([
				['exp in the past', { iat: now() - 7200, exp: now() - 3600 }],
				['missing exp', { exp: undefined }],
				['missing iat', { iat: undefined }],
				['nbf 10 minutes ahead', { nbf: now() + 600 }],
				['iat 10 minutes ahead', { iat: now() + 600, exp: now() + 4200 }],
			])('rejects a token with %s as expired', async (_name, claims) => {
				expect(await verify(await sign(claims))).toMatchObject({ ok: false, reason: 'expired' });
			});

			it('tolerates an iat within the default clock skew', async () => {
				const iat = now() + 30;

				expect(await verify(await sign({ iat, exp: iat + 3600 }))).toMatchObject({ ok: true });
			});

			it('rejects a lifetime above the source maximum with a detail', async () => {
				const src = source({ authentication: { maxTokenLifetimeSeconds: 3600 } });
				const iat = now();

				expect(await verify(await sign({ iat, exp: iat + 7200 }), src)).toMatchObject({
					ok: false,
					reason: 'expired',
					detail: expect.any(String),
				});
			});
		});

		describe('audience', () => {
			it.each<{
				name: string;
				aud?: string | string[];
				surfaceAudiences?: string[];
				expected: 'ok' | 'audience-mismatch';
			}>([
				{ name: 'a string equal to the resource URL', aud: RESOURCE, expected: 'ok' },
				{ name: 'an array containing the resource URL', aud: ['other', RESOURCE], expected: 'ok' },
				{
					name: 'the surface audience of the source',
					aud: 'api://n8n',
					surfaceAudiences: ['api://n8n'],
					expected: 'ok',
				},
				{
					name: 'the resource URL when the source lists other audiences',
					aud: RESOURCE,
					surfaceAudiences: ['api://n8n'],
					expected: 'audience-mismatch',
				},
				{ name: 'an unrelated audience', aud: 'other', expected: 'audience-mismatch' },
				{ name: 'no aud', aud: undefined, expected: 'audience-mismatch' },
			])('$name -> $expected', async ({ aud, surfaceAudiences, expected }) => {
				const src = source({ surfaces: { [SURFACE]: { audiences: surfaceAudiences } } });

				const result = await verify(await sign({ aud }), src);

				if (expected === 'ok') expect(result).toMatchObject({ ok: true });
				else expect(result).toMatchObject({ ok: false, reason: expected });
			});
		});

		it('rejects a source without a JWKS document as unusable', async () => {
			const src = source({ metadata: null });

			expect(await verify(await sign(), src)).toMatchObject({
				ok: false,
				reason: 'source-unusable',
			});
		});
	});

	describe('advertise', () => {
		it('lists only oauth2 issuers and challenges with the protected resource metadata URL', () => {
			const oauth2Source = source();
			const samlSource: TrustedSource = {
				...oauth2Source,
				id: 's2',
				type: 'saml' as never,
				issuer: 'https://saml.example',
			};

			const advertised = driver.advertise(
				{ surface: SURFACE, resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] } },
				[oauth2Source, samlSource],
			);

			expect(advertised.authorizationServers).toEqual([ISSUER]);
			expect(advertised.challenge).toBe(
				'Bearer resource_metadata="https://n8n.example/.well-known/oauth-protected-resource/mcp"',
			);
		});
	});
});
