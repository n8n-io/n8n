import type { OutboundHttp } from '@n8n/backend-network';
import { OperationalError, UserError } from 'n8n-workflow';
import { generateKeyPairSync } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { OAuthDiscoveryClient } from '../oauth-discovery-client';

const ISSUER = 'https://idp.example';
const JWKS_URL = 'https://idp.example/keys';

function jsonResponse(
	body: unknown,
	{ status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers },
	});
}

function metadata(overrides: Record<string, unknown> = {}) {
	return {
		issuer: ISSUER,
		jwks_uri: JWKS_URL,
		authorization_endpoint: 'https://idp.example/authorize',
		token_endpoint: 'https://idp.example/token',
		...overrides,
	};
}

function createClient() {
	const fetchMock = vi.fn<typeof globalThis.fetch>();
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue({
		asCustomFetch: () => fetchMock,
		getDispatcher: vi.fn(),
		getNodeAgent: vi.fn(),
	});
	const client = new OAuthDiscoveryClient(outboundHttp);
	return { client, fetchMock, outboundHttp };
}

/** The url and init of the first request made through the transport fetch. */
function firstRequest(fetchMock: ReturnType<typeof vi.fn<typeof globalThis.fetch>>) {
	const [input, init] = fetchMock.mock.calls[0];
	const url = input instanceof Request ? input.url : input.toString();
	return { url, init };
}

// Real key material so the implementation can run the JWK through `createPublicKey`.
const rsaJwk = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({
	format: 'jwk',
});
const ecJwk = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({
	format: 'jwk',
});
const rsaSigKey = { ...rsaJwk, kid: 'rsa1', use: 'sig', alg: 'RS256' };
const ecSigKey = { ...ecJwk, kid: 'ec1', alg: 'ES256' };

describe('OAuthDiscoveryClient', () => {
	describe('transport', () => {
		it('requests the transport with the enforced SSRF policy', () => {
			const { outboundHttp } = createClient();

			expect(outboundHttp.transport).toHaveBeenCalledTimes(1);
			expect(outboundHttp.transport).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'enforced' });
		});
	});

	describe('URL derivation', () => {
		it('derives the OIDC discovery url from the issuer', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata()));

			await client.fetchOpenIdConfiguration(ISSUER);

			expect(firstRequest(fetchMock).url).toBe(
				'https://idp.example/.well-known/openid-configuration',
			);
		});

		it('does not double the slash when the issuer has a trailing slash', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse(metadata({ issuer: 'https://idp.example/tenant/' })),
			);

			await client.fetchOpenIdConfiguration('https://idp.example/tenant/');

			expect(firstRequest(fetchMock).url).toBe(
				'https://idp.example/tenant/.well-known/openid-configuration',
			);
		});

		it('derives the RFC 8414 url from an issuer without a path', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata()));

			await client.fetchOAuth2ServerMetadata({ issuer: ISSUER });

			expect(firstRequest(fetchMock).url).toBe(
				'https://idp.example/.well-known/oauth-authorization-server',
			);
		});

		it('inserts the well-known segment before the issuer path (RFC 8414)', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata({ issuer: 'https://idp.example/tenant' })));

			await client.fetchOAuth2ServerMetadata({ issuer: 'https://idp.example/tenant' });

			expect(firstRequest(fetchMock).url).toBe(
				'https://idp.example/.well-known/oauth-authorization-server/tenant',
			);
		});

		it('requests exactly the manual metadata url when one is given', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata()));

			await client.fetchOAuth2ServerMetadata({
				issuer: ISSUER,
				url: 'https://idp.example/custom/metadata',
			});

			expect(firstRequest(fetchMock).url).toBe('https://idp.example/custom/metadata');
		});

		it('sends every request with redirect error, an abort signal and a JSON accept header', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata()));

			await client.fetchOpenIdConfiguration(ISSUER);

			const { init } = firstRequest(fetchMock);
			expect(init?.redirect).toBe('error');
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			expect(new Headers(init?.headers).get('accept')).toBe('application/json');
		});
	});

	describe('issuer and url guards', () => {
		it.each([
			['http scheme', 'http://idp.example'],
			['query string', 'https://idp.example/?x=1'],
			['fragment', 'https://idp.example/#f'],
		])('rejects an issuer with a %s before fetching (OIDC path)', async (_, issuer) => {
			const { client, fetchMock } = createClient();

			await expect(client.fetchOpenIdConfiguration(issuer)).rejects.toBeInstanceOf(UserError);

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it.each([
			['http scheme', 'http://idp.example'],
			['query string', 'https://idp.example/?x=1'],
			['fragment', 'https://idp.example/#f'],
		])('rejects an issuer with a %s before fetching (RFC 8414 path)', async (_, issuer) => {
			const { client, fetchMock } = createClient();

			await expect(client.fetchOAuth2ServerMetadata({ issuer })).rejects.toBeInstanceOf(UserError);

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('rejects a manual metadata url that is not https before fetching', async () => {
			const { client, fetchMock } = createClient();

			await expect(
				client.fetchOAuth2ServerMetadata({ issuer: ISSUER, url: 'http://idp.example/metadata' }),
			).rejects.toBeInstanceOf(UserError);

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('metadata responses', () => {
		it('returns the document with unknown fields kept and a ttl', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata({ foo: 'bar' })));

			const result = await client.fetchOpenIdConfiguration(ISSUER);

			expect(result).toBeDefined();
			expect(result?.document).toMatchObject(metadata({ foo: 'bar' }));
			expect(result?.document.foo).toBe('bar');
			expect(typeof result?.ttlSeconds).toBe('number');
		});

		it('rejects when the returned issuer differs from the requested one', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata({ issuer: 'https://idp.example/' })));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('resolves to undefined on 404 for the OIDC document', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, { status: 404 }));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).resolves.toBeUndefined();
		});

		it('resolves to undefined on 404 for the RFC 8414 document', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, { status: 404 }));

			await expect(client.fetchOAuth2ServerMetadata({ issuer: ISSUER })).resolves.toBeUndefined();
		});

		it('rejects on a 500 response', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 500 }));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('rejects when the body is not JSON', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				new Response('<html>nope</html>', {
					status: 200,
					headers: { 'content-type': 'text/html' },
				}),
			);

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('rejects when jwks_uri is not https', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse(metadata({ jwks_uri: 'http://idp.example/keys' })));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('rejects when the body has no issuer', async () => {
			const { client, fetchMock } = createClient();
			const { issuer: _dropped, ...withoutIssuer } = metadata();
			fetchMock.mockResolvedValue(jsonResponse(withoutIssuer));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('rejects a body larger than 1 MiB', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ issuer: ISSUER, pad: 'x'.repeat(1024 * 1024) }));

			await expect(client.fetchOpenIdConfiguration(ISSUER)).rejects.toBeInstanceOf(
				OperationalError,
			);
		});

		it('wraps a network failure in an OperationalError that names the url', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockRejectedValue(new TypeError('fetch failed'));

			const promise = client.fetchOpenIdConfiguration(ISSUER);

			await expect(promise).rejects.toBeInstanceOf(OperationalError);
			await expect(promise).rejects.toThrow('https://idp.example/.well-known/openid-configuration');
		});
	});

	describe('ttl from Cache-Control', () => {
		it.each([
			{ label: 'absent', cacheControl: undefined, expected: 3600 },
			{ label: 'max-age=10', cacheControl: 'max-age=10', expected: 60 },
			{ label: 'max-age=600', cacheControl: 'max-age=600', expected: 600 },
			{ label: 'max-age=1000000', cacheControl: 'max-age=1000000', expected: 86400 },
			{ label: 'public, max-age=300', cacheControl: 'public, max-age=300', expected: 300 },
		])('Cache-Control $label gives ttlSeconds $expected', async ({ cacheControl, expected }) => {
			const { client, fetchMock } = createClient();
			const headers: Record<string, string> =
				cacheControl === undefined ? {} : { 'cache-control': cacheControl };
			fetchMock.mockResolvedValue(jsonResponse(metadata(), { headers }));

			const result = await client.fetchOpenIdConfiguration(ISSUER);

			expect(result?.ttlSeconds).toBe(expected);
		});
	});

	describe('fetchJwks', () => {
		it('returns RSA and EC signing keys in order with their material kept', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ keys: [rsaSigKey, ecSigKey] }));

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1', 'ec1']);
			expect(result.keys[0]).toMatchObject({ kty: 'RSA', n: rsaJwk.n, e: rsaJwk.e });
			expect(result.keys[1]).toMatchObject({ kty: 'EC', x: ecJwk.x, y: ecJwk.y });
			expect(result.skipped).toEqual([]);
		});

		it('skips a key with use enc', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [rsaSigKey, { ...rsaJwk, kid: 'enc1', use: 'enc', alg: 'RS256' }] }),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1']);
			expect(result.skipped).toEqual([{ kid: 'enc1', reason: expect.stringContaining('enc') }]);
		});

		it('skips a key with kty oct', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [rsaSigKey, { kty: 'oct', kid: 'oct1', k: 'c2VjcmV0' }] }),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1']);
			expect(result.skipped).toEqual([{ kid: 'oct1', reason: expect.any(String) }]);
		});

		it('skips a key whose alg does not match its kty', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [rsaSigKey, { ...rsaJwk, kid: 'mismatch', alg: 'ES256' }] }),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1']);
			expect(result.skipped).toEqual([{ kid: 'mismatch', reason: expect.any(String) }]);
		});

		it('skips a key with an unsupported alg', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [rsaSigKey, { ...rsaJwk, kid: 'hmac', alg: 'HS256' }] }),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1']);
			expect(result.skipped).toEqual([{ kid: 'hmac', reason: expect.any(String) }]);
		});

		it('skips an RSA key with unusable material', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({
					keys: [rsaSigKey, { kty: 'RSA', kid: 'garbage', alg: 'RS256', n: '!!!', e: 'AQAB' }],
				}),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.keys.map((k) => k.kid)).toEqual(['rsa1']);
			expect(result.skipped).toEqual([{ kid: 'garbage', reason: expect.any(String) }]);
		});

		it('rejects when every key is skipped', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [{ ...rsaJwk, kid: 'enc1', use: 'enc', alg: 'RS256' }] }),
			);

			await expect(client.fetchJwks(JWKS_URL)).rejects.toBeInstanceOf(OperationalError);
		});

		it('rejects on 404', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, { status: 404 }));

			await expect(client.fetchJwks(JWKS_URL)).rejects.toBeInstanceOf(OperationalError);
		});

		it('reads ttlSeconds from Cache-Control', async () => {
			const { client, fetchMock } = createClient();
			fetchMock.mockResolvedValue(
				jsonResponse({ keys: [rsaSigKey] }, { headers: { 'cache-control': 'max-age=600' } }),
			);

			const result = await client.fetchJwks(JWKS_URL);

			expect(result.ttlSeconds).toBe(600);
		});

		it('rejects a url that is not https before fetching', async () => {
			const { client, fetchMock } = createClient();

			await expect(client.fetchJwks('http://idp.example/keys')).rejects.toBeInstanceOf(UserError);

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});
