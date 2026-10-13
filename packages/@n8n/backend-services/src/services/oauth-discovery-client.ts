import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';
import { createPublicKey } from 'node:crypto';
import { z } from 'zod';

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1024 * 1024;
const MIN_TTL_SECONDS = 60;
const DEFAULT_TTL_SECONDS = 3600;
const MAX_TTL_SECONDS = 86_400;

// An admin-supplied endpoint is fetched server-side, so it must be https.
const HttpsUrl = z
	.string()
	.url()
	.refine((url) => url.startsWith('https://'), { message: 'must be an https URL' });

/** RFC 8414 fields. OIDC Discovery documents carry the same core fields, so one schema reads both. */
export const AuthorizationServerMetadataSchema = z
	.object({
		issuer: z.string().min(1),
		jwks_uri: HttpsUrl.optional(),
		authorization_endpoint: HttpsUrl.optional(),
		token_endpoint: HttpsUrl.optional(),
	})
	.passthrough();
export type AuthorizationServerMetadata = z.infer<typeof AuthorizationServerMetadataSchema>;

export const JwkSchema = z
	.object({
		kid: z.string().optional(),
		kty: z.enum(['RSA', 'EC', 'OKP']),
		use: z.string().optional(),
		alg: z.string().optional(),
	})
	.passthrough();
export type Jwk = z.infer<typeof JwkSchema>;

export type Fetched<T> = { document: T; ttlSeconds: number };
export type SkippedJwk = { kid?: string; reason: string };
export type FetchedJwks = { keys: Jwk[]; skipped: SkippedJwk[]; ttlSeconds: number };

const JwkSetSchema = z.object({ keys: z.array(z.unknown()) });

/** Key type each supported JWS signing algorithm needs. Any other `alg` is not accepted. */
const ALG_KEY_TYPE: Record<string, Jwk['kty']> = {
	RS256: 'RSA',
	RS384: 'RSA',
	RS512: 'RSA',
	PS256: 'RSA',
	PS384: 'RSA',
	PS512: 'RSA',
	ES256: 'EC',
	ES384: 'EC',
	ES512: 'EC',
	EdDSA: 'OKP',
};

/** Public key material each key type must carry (RFC 7518 section 6). */
const REQUIRED_MATERIAL: Record<Jwk['kty'], string[]> = {
	RSA: ['n', 'e'],
	EC: ['x', 'y'],
	OKP: ['x'],
};

// Node's base64url decoder drops characters it cannot decode instead of failing, so
// `createPublicKey` turns garbage material into an empty key. Check the encoding first.
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

type FetchedJson = { body: unknown; ttlSeconds: number };

function parseIssuer(issuer: string): URL {
	let url: URL;
	try {
		url = new URL(issuer);
	} catch {
		throw new UserError(`Issuer "${issuer}" is not a valid URL`);
	}
	if (url.protocol !== 'https:') {
		throw new UserError(`Issuer "${issuer}" must use https`);
	}
	if (url.search !== '' || url.hash !== '') {
		throw new UserError(`Issuer "${issuer}" must not have a query string or fragment`);
	}
	return url;
}

function assertHttpsUrl(url: string, label: string): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new UserError(`${label} "${url}" is not a valid URL`);
	}
	if (parsed.protocol !== 'https:') {
		throw new UserError(`${label} "${url}" must use https`);
	}
}

function parseMaxAge(cacheControl: string | null): number | undefined {
	if (!cacheControl) return undefined;
	const match = /(?:^|[\s,])max-age=(\d+)/i.exec(cacheControl);
	return match ? Number.parseInt(match[1], 10) : undefined;
}

function ttlFromHeaders(headers: Headers): number {
	const maxAge = parseMaxAge(headers.get('cache-control')) ?? DEFAULT_TTL_SECONDS;
	return Math.max(MIN_TTL_SECONDS, Math.min(maxAge, MAX_TTL_SECONDS));
}

function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
		.join('; ');
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function toSigningKey(raw: unknown): { key: Jwk } | { skipped: SkippedJwk } {
	const parsed = JwkSchema.safeParse(raw);
	if (!parsed.success) {
		const kid = isRecord(raw) && typeof raw.kid === 'string' ? raw.kid : undefined;
		return { skipped: { kid, reason: `invalid JWK: ${formatIssues(parsed.error)}` } };
	}

	const jwk = parsed.data;
	const skip = (reason: string) => ({ skipped: { kid: jwk.kid, reason } });

	if (jwk.use === 'enc') {
		return skip('use is "enc", not a signing key');
	}

	if (jwk.alg !== undefined) {
		const expectedKty = ALG_KEY_TYPE[jwk.alg];
		if (expectedKty === undefined) {
			return skip(`unsupported alg "${jwk.alg}"`);
		}
		if (expectedKty !== jwk.kty) {
			return skip(`alg "${jwk.alg}" does not match kty "${jwk.kty}"`);
		}
	}

	for (const field of REQUIRED_MATERIAL[jwk.kty]) {
		const value = jwk[field];
		if (typeof value !== 'string' || !BASE64URL.test(value)) {
			return skip(`"${field}" is not base64url key material`);
		}
	}

	try {
		createPublicKey({ key: jwk, format: 'jwk' });
	} catch (error) {
		return skip(`key material is unusable: ${errorMessage(error)}`);
	}

	return { key: jwk };
}

@Service()
export class OAuthDiscoveryClient {
	private readonly fetch: typeof globalThis.fetch;

	constructor(outboundHttp: OutboundHttp) {
		// Admin-supplied URLs are a server-side fetch: the guard runs even when the instance flag is off.
		this.fetch = outboundHttp.transport({ useDefaultSsrfPolicy: 'enforced' }).asCustomFetch();
	}

	/** `undefined` when the issuer answers 404: the document is not offered, which is not an error. */
	async fetchOpenIdConfiguration(
		issuer: string,
	): Promise<Fetched<AuthorizationServerMetadata> | undefined> {
		parseIssuer(issuer);
		// OIDC Discovery appends to the issuer; only one slash may separate the two parts.
		const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
		return await this.fetchMetadata(issuer, url);
	}

	async fetchOAuth2ServerMetadata({
		issuer,
		url,
	}: {
		issuer: string;
		url?: string;
	}): Promise<Fetched<AuthorizationServerMetadata> | undefined> {
		const issuerUrl = parseIssuer(issuer);
		if (url !== undefined) {
			assertHttpsUrl(url, 'Metadata URL');
			return await this.fetchMetadata(issuer, url);
		}
		// RFC 8414 inserts the well-known segment between the host and the issuer path.
		const path = issuerUrl.pathname === '/' ? '' : issuerUrl.pathname.replace(/\/$/, '');
		return await this.fetchMetadata(
			issuer,
			`${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`,
		);
	}

	async fetchJwks(url: string): Promise<FetchedJwks> {
		assertHttpsUrl(url, 'JWKS URL');
		const fetched = await this.fetchJson(url);
		if (fetched === undefined) {
			throw new OperationalError(`Request to "${url}" failed: HTTP 404`);
		}

		const set = JwkSetSchema.safeParse(fetched.body);
		if (!set.success) {
			throw new OperationalError(`Response from "${url}" is not a JWK Set`);
		}

		const keys: Jwk[] = [];
		const skipped: SkippedJwk[] = [];
		for (const raw of set.data.keys) {
			const result = toSigningKey(raw);
			if ('key' in result) {
				keys.push(result.key);
			} else {
				skipped.push(result.skipped);
			}
		}

		if (keys.length === 0) {
			const reasons = skipped.map((s) => `${s.kid ?? '<no kid>'}: ${s.reason}`).join('; ');
			throw new OperationalError(
				`JWKS at "${url}" has no usable signing keys${reasons ? ` (${reasons})` : ''}`,
			);
		}

		return { keys, skipped, ttlSeconds: fetched.ttlSeconds };
	}

	private async fetchMetadata(
		issuer: string,
		url: string,
	): Promise<Fetched<AuthorizationServerMetadata> | undefined> {
		const fetched = await this.fetchJson(url);
		if (fetched === undefined) return undefined;

		const parsed = AuthorizationServerMetadataSchema.safeParse(fetched.body);
		if (!parsed.success) {
			throw new OperationalError(
				`Response from "${url}" is not a valid metadata document: ${formatIssues(parsed.error)}`,
			);
		}

		// RFC 8414 section 3.3: the document must name the configured issuer, compared byte for byte.
		if (parsed.data.issuer !== issuer) {
			throw new OperationalError(
				`Metadata from "${url}" names issuer "${parsed.data.issuer}", expected "${issuer}"`,
			);
		}

		return { document: parsed.data, ttlSeconds: fetched.ttlSeconds };
	}

	/** `undefined` on 404 so each caller decides whether a missing document is an error. */
	private async fetchJson(url: string): Promise<FetchedJson | undefined> {
		let response: Response;
		try {
			response = await this.fetch(url, {
				method: 'GET',
				headers: { accept: 'application/json' },
				redirect: 'error',
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
		} catch (error) {
			throw new OperationalError(`Request to "${url}" failed: ${errorMessage(error)}`);
		}

		if (response.status === 404) return undefined;
		if (!response.ok) {
			throw new OperationalError(`Request to "${url}" failed: HTTP ${response.status}`);
		}

		let text: string;
		try {
			text = await response.text();
		} catch (error) {
			throw new OperationalError(`Request to "${url}" failed: ${errorMessage(error)}`);
		}
		if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
			throw new OperationalError(`Response from "${url}" exceeds ${MAX_BODY_BYTES} bytes`);
		}

		let body: unknown;
		try {
			body = JSON.parse(text);
		} catch {
			throw new OperationalError(`Response from "${url}" is not JSON`);
		}

		return { body, ttlSeconds: ttlFromHeaders(response.headers) };
	}
}
