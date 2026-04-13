import {
	generateKeyPair,
	exportJWK,
	importJWK,
	SignJWT,
	CompactEncrypt,
	calculateJwkThumbprint,
} from 'jose';
import type { JWK, KeyObject } from 'jose';
import * as http from 'node:http';
import { URL, URLSearchParams } from 'node:url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdpState {
	/** n8n's public encryption key, set via `/configure-jwk` or fetched from JWKS. */
	n8nPublicJwk: JWK | undefined;
	/** IdP's own signing key pair, generated once on startup. */
	signingPrivateKey: KeyObject;
	signingPublicJwk: JWK;
}

interface IdpHandle {
	/** Base URL of the running server, e.g. `http://localhost:3456`. */
	baseUrl: string;
	/** Gracefully shut the server down. */
	close: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
	res: http.ServerResponse,
	status: number,
	body: Record<string, unknown>,
): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

function errorResponse(res: http.ServerResponse, status: number, message: string): void {
	jsonResponse(res, status, { error: message });
}

async function readBody(req: http.IncomingMessage): Promise<string> {
	return await new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString()));
		req.on('error', reject);
	});
}

/**
 * Fetch n8n's public encryption key from a JWKS URI.
 * Returns the first key with `use: "enc"`, or the first key.
 */
async function fetchPublicKeyFromJwks(jwksUri: string): Promise<JWK> {
	const response = await fetch(jwksUri);
	if (!response.ok) {
		throw new Error(`Failed to fetch JWKS from ${jwksUri}: ${response.status}`);
	}
	const jwks = (await response.json()) as { keys: JWK[] };
	const encKey = jwks.keys.find((k) => k.use === 'enc') ?? jwks.keys[0];
	if (!encKey) {
		throw new Error('No keys found in JWKS response');
	}
	return encKey;
}

/**
 * Build a JWE compact serialization that wraps a signed JWT (nested JWT).
 *
 * 1. Create a JWS (signed JWT) with the given claims.
 * 2. Encrypt the JWS into a JWE using the recipient's public key
 *    (RSA-OAEP + A256GCM) with `cty: "JWT"`.
 */
async function buildNestedJweToken(
	claims: Record<string, unknown>,
	recipientJwk: JWK,
	state: IdpState,
): Promise<string> {
	const signedJwt = await new SignJWT(claims)
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(state.signingPrivateKey);

	const recipientKey = await importJWK(recipientJwk, 'RSA-OAEP');
	const jwe = await new CompactEncrypt(new TextEncoder().encode(signedJwt))
		.setProtectedHeader({
			alg: 'RSA-OAEP',
			enc: 'A256GCM',
			cty: 'JWT',
			kid: recipientJwk.kid,
		})
		.encrypt(recipientKey);

	return jwe;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleDiscovery(
	baseUrl: string,
	_req: http.IncomingMessage,
	res: http.ServerResponse,
): void {
	jsonResponse(res, 200, {
		issuer: baseUrl,
		authorization_endpoint: `${baseUrl}/authorize`,
		token_endpoint: `${baseUrl}/token`,
		jwks_uri: `${baseUrl}/.well-known/jwks.json`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		subject_types_supported: ['public'],
		id_token_signing_alg_values_supported: ['RS256'],
		id_token_encryption_alg_values_supported: ['RSA-OAEP'],
		id_token_encryption_enc_values_supported: ['A256GCM'],
		userinfo_endpoint: `${baseUrl}/userinfo`,
		token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
	});
}

function handleJwks(state: IdpState, _req: http.IncomingMessage, res: http.ServerResponse): void {
	jsonResponse(res, 200, { keys: [state.signingPublicJwk] });
}

function handleAuthorize(req: http.IncomingMessage, res: http.ServerResponse): void {
	const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
	const redirectUri = url.searchParams.get('redirect_uri');
	const state = url.searchParams.get('state');

	if (!redirectUri) {
		errorResponse(res, 400, 'redirect_uri is required');
		return;
	}

	const target = new URL(redirectUri);
	target.searchParams.set('code', 'test-auth-code');
	if (state) {
		target.searchParams.set('state', state);
	}

	res.writeHead(302, { Location: target.toString() });
	res.end();
}

async function handleToken(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	state: IdpState,
	jwksUri: string | undefined,
): Promise<void> {
	const body = await readBody(req);
	const params = new URLSearchParams(body);
	const clientId = params.get('client_id') ?? 'unknown-client';

	// Resolve n8n's public key
	let publicKey = state.n8nPublicJwk;
	if (!publicKey && jwksUri) {
		try {
			publicKey = await fetchPublicKeyFromJwks(jwksUri);
		} catch (err) {
			console.error(err);
			errorResponse(res, 500, `Failed to fetch JWKS: ${String(err)}`);
			return;
		}
	}
	if (!publicKey) {
		console.error('Error: missing public key');
		errorResponse(
			res,
			500,
			'No encryption public key configured. POST to /configure-jwk or set jwksUri.',
		);
		return;
	}

	const now = Math.floor(Date.now() / 1000);
	const claims = {
		sub: 'test-user',
		iss: 'test-idp',
		aud: clientId,
		intern_oauth_token: 'the-actual-bearer-token-12345',
		iat: now,
		exp: now + 3600,
	};

	try {
		const jweToken = await buildNestedJweToken(claims, publicKey, state);

		jsonResponse(res, 200, {
			access_token: jweToken,
			token_type: 'bearer',
			expires_in: 3600,
			id_token: jweToken,
		});
	} catch (err) {
		errorResponse(res, 500, `Token generation failed: ${String(err)}`);
	}
}

async function handleConfigureJwk(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	state: IdpState,
): Promise<void> {
	const body = await readBody(req);
	try {
		const jwk = JSON.parse(body) as JWK;
		if (!jwk.kty) {
			errorResponse(res, 400, 'Invalid JWK: missing kty');
			return;
		}
		state.n8nPublicJwk = jwk;
		jsonResponse(res, 200, { ok: true });
	} catch {
		errorResponse(res, 400, 'Invalid JSON body');
	}
}

function handleUserInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith('Bearer ')) {
		errorResponse(res, 401, 'Missing or invalid Authorization header');
		return;
	}

	const token = authHeader.slice('Bearer '.length);

	// The token should be the extracted `intern_oauth_token` value
	console.log('token: ', token);
	if (token !== 'the-actual-bearer-token-12345') {
		errorResponse(res, 403, `Invalid access token: "${token}"`);
		return;
	}

	jsonResponse(res, 200, {
		sub: 'test-user',
		name: 'Test User',
		email: 'testuser@meta.example.com',
		picture: 'https://example.com/avatar.png',
		groups: ['engineering', 'n8n-admins'],
	});
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

/**
 * Start a minimal OIDC-like Identity Provider for testing JWE token flows.
 *
 * The IdP returns JWE-encrypted nested JWTs from the /token endpoint.
 * The inner JWT contains a custom `intern_oauth_token` claim with the
 * actual Bearer token, mimicking Meta's OIDC provider behavior.
 *
 * @example
 * ```ts
 * const idp = await startTestIdp(3456);
 * console.log(idp.baseUrl); // http://localhost:3456
 *
 * // Configure n8n's public key manually:
 * await fetch(`${idp.baseUrl}/configure-jwk`, {
 *   method: 'POST',
 *   body: JSON.stringify(n8nPublicJwk),
 * });
 *
 * // Or pass a JWKS URI for automatic key fetching:
 * const idp = await startTestIdp(3456, 'http://localhost:5678/oauth2-credential/123/jwks.json');
 *
 * await idp.close();
 * ```
 */
export async function startTestIdp(port: number, jwksUri?: string): Promise<IdpHandle> {
	// Generate the IdP's signing key pair
	const keyPair = await generateKeyPair('RS256', { extractable: true });
	const pubJwk = await exportJWK(keyPair.publicKey);
	const kid = await calculateJwkThumbprint(pubJwk);
	pubJwk.kid = kid;
	pubJwk.use = 'sig';
	pubJwk.alg = 'RS256';

	const state: IdpState = {
		n8nPublicJwk: undefined,
		signingPrivateKey: keyPair.privateKey,
		signingPublicJwk: pubJwk,
	};

	const baseUrl = `http://localhost:${port}`;

	const server = http.createServer((req, res) => {
		const url = new URL(req.url ?? '/', baseUrl);
		const path = url.pathname;

		if (path === '/.well-known/openid-configuration' && req.method === 'GET') {
			handleDiscovery(baseUrl, req, res);
		} else if (path === '/.well-known/jwks.json' && req.method === 'GET') {
			handleJwks(state, req, res);
		} else if (path === '/authorize' && req.method === 'GET') {
			handleAuthorize(req, res);
		} else if (path === '/token' && req.method === 'POST') {
			void handleToken(req, res, state, jwksUri);
		} else if (path === '/userinfo' && req.method === 'GET') {
			handleUserInfo(req, res);
		} else if (path === '/configure-jwk' && req.method === 'POST') {
			void handleConfigureJwk(req, res, state);
		} else {
			errorResponse(res, 404, 'Not found');
		}
	});

	return await new Promise<IdpHandle>((resolve, reject) => {
		server.on('error', reject);
		server.listen(port, () => {
			resolve({
				baseUrl,
				close: async () =>
					await new Promise<void>((res, rej) => {
						server.close((error) => (error ? rej(error) : res()));
					}),
			});
		});
	});
}

// Allow running directly: npx ts-node server.ts [port] [jwksUri]
if (require.main === module) {
	const port = parseInt(process.argv[2] ?? '3456', 10);
	const jwksUri = process.argv[3];
	void startTestIdp(port, jwksUri).then((idp) => {
		console.log(`Test IdP running at ${idp.baseUrl}`);
		console.log(`  Discovery: ${idp.baseUrl}/.well-known/openid-configuration`);
		console.log(`  Authorize: ${idp.baseUrl}/authorize`);
		console.log(`  Token:     ${idp.baseUrl}/token`);
		console.log(`  UserInfo:  ${idp.baseUrl}/userinfo`);
		console.log(`  Configure: POST ${idp.baseUrl}/configure-jwk`);
		if (jwksUri) {
			console.log(`  JWKS URI:  ${jwksUri} (auto-fetch)`);
		}
	});
}
