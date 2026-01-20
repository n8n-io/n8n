import { Get, RestController } from '@n8n/decorators';
import { Logger } from '@n8n/backend-common';
import { CredentialsRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import * as jose from 'jose';
import { Credentials } from 'n8n-core';
import { createHmac } from 'node:crypto';

/**
 * Centralized OIDC Callback Controller for Webhook/Form/Chat Trigger authentication
 *
 * This provides a single callback URL (/oidc-callback) that users register in their IdP,
 * eliminating the need to register every individual webhook/form URL.
 */

interface OidcState {
	/** CSRF protection token */
	csrf: string;
	/** PKCE code verifier */
	codeVerifier: string;
	/** Original URL to redirect back to after auth */
	returnUrl: string;
	/** Credential ID to use for token exchange */
	credentialId: string;
	/** Webhook path for session cookie scoping */
	webhookPath: string;
	/** Timestamp for expiration check */
	timestamp: number;
}

interface OidcDiscoveryDocument {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
}

interface OidcSession {
	sub: string;
	email?: string;
	name?: string;
	exp: number;
	iat: number;
}

// Type guards for OIDC validation
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOidcDiscoveryDocument(value: unknown): value is OidcDiscoveryDocument {
	if (!isRecord(value)) return false;
	return (
		typeof value.issuer === 'string' &&
		typeof value.jwks_uri === 'string' &&
		typeof value.authorization_endpoint === 'string' &&
		typeof value.token_endpoint === 'string'
	);
}

function isOidcState(value: unknown): value is OidcState {
	if (!isRecord(value)) return false;
	return (
		typeof value.csrf === 'string' &&
		typeof value.codeVerifier === 'string' &&
		typeof value.returnUrl === 'string' &&
		typeof value.credentialId === 'string' &&
		typeof value.webhookPath === 'string' &&
		typeof value.timestamp === 'number'
	);
}

// Cache for discovery documents and JWKS
const discoveryCache = new Map<string, { doc: OidcDiscoveryDocument; expires: number }>();
const jwksCache = new Map<string, jose.JWTVerifyGetKey>();
const DISCOVERY_CACHE_TTL = 3600000; // 1 hour

async function getDiscoveryDocument(discoveryUrl: string): Promise<OidcDiscoveryDocument> {
	const cached = discoveryCache.get(discoveryUrl);
	if (cached && cached.expires > Date.now()) {
		return cached.doc;
	}

	const response = await fetch(discoveryUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch OIDC discovery document: ${response.statusText}`);
	}

	const data: unknown = await response.json();
	if (!isOidcDiscoveryDocument(data)) {
		throw new Error('Invalid OIDC discovery document structure');
	}

	discoveryCache.set(discoveryUrl, { doc: data, expires: Date.now() + DISCOVERY_CACHE_TTL });
	return data;
}

async function getJwks(jwksUri: string): Promise<jose.JWTVerifyGetKey> {
	if (!jwksCache.has(jwksUri)) {
		jwksCache.set(jwksUri, jose.createRemoteJWKSet(new URL(jwksUri)));
	}
	return jwksCache.get(jwksUri)!;
}

/**
 * Normalize webhook path to remove test/production prefixes
 * This allows the same session cookie to work for both test and production modes
 */
function normalizeWebhookPath(webhookPath: string): string {
	return webhookPath
		.replace(/^\/(form|webhook|chat)-test\//, '/$1/')
		.replace(/^\/form\/test\//, '/form/');
}

function getSessionCookieName(webhookPath: string): string {
	const normalizedPath = normalizeWebhookPath(webhookPath);
	const hash = createHmac('sha256', 'n8n-oidc').update(normalizedPath).digest('hex').substring(0, 8);
	return `n8n_oidc_${hash}`;
}

function signSession(session: OidcSession, secret: string): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
	const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
	return `${header}.${payload}.${signature}`;
}

@RestController('/oidc-callback')
export class OidcCallbackController {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	/**
	 * Handle OIDC authorization code callback
	 * Exchange code for tokens, validate, create session, redirect back to original URL
	 */
	@Get('/', { skipAuth: true })
	async handleCallback(req: Request, res: Response): Promise<void> {
		try {
			const { code, state: encodedState, error, error_description } = req.query as {
				code?: string;
				state?: string;
				error?: string;
				error_description?: string;
			};

			// Handle error response from IdP
			if (error) {
				this.logger.error('OIDC callback received error from IdP', { error, error_description });
				res.status(401).send(`Authentication failed: ${error_description || error}`);
				return;
			}

			if (!code || !encodedState) {
				res.status(400).send('Missing code or state parameter');
				return;
			}

			// Decode and verify state
			const stateCookieRaw: unknown = req.cookies?.['n8n_oidc_state'];
			if (!stateCookieRaw || typeof stateCookieRaw !== 'string') {
				res.status(401).send('Missing state cookie - session may have expired');
				return;
			}
			const stateCookie: string = stateCookieRaw;

			let state: OidcState;
			try {
				const parsed: unknown = JSON.parse(Buffer.from(stateCookie, 'base64url').toString());
				if (!isOidcState(parsed)) {
					res.status(401).send('Invalid state cookie structure');
					return;
				}
				state = parsed;
			} catch {
				res.status(401).send('Invalid state cookie');
				return;
			}

			// Verify CSRF token matches
			const receivedStateParsed: unknown = JSON.parse(
				Buffer.from(encodedState, 'base64url').toString(),
			);
			if (!isRecord(receivedStateParsed) || typeof receivedStateParsed.csrf !== 'string') {
				res.status(401).send('Invalid state parameter');
				return;
			}
			if (receivedStateParsed.csrf !== state.csrf) {
				res.status(401).send('State mismatch - possible CSRF attack');
				return;
			}

			// Check state expiration (10 minutes)
			if (Date.now() - state.timestamp > 600000) {
				res.status(401).send('Authentication session expired');
				return;
			}

			// Load credential to get OIDC configuration
			let oidcConfig: {
				discoveryUrl: string;
				clientId: string;
				clientSecret: string;
				scopes: string;
				issuer: string;
				audience: string;
				sessionSecret: string;
				sessionDurationHours: number;
			};

			try {
				const credentialEntity = await this.credentialsRepository.findOneBy({
					id: state.credentialId,
					type: 'oidcWebhookAuth',
				});

				if (!credentialEntity) {
					throw new Error('Credential not found');
				}

				const credentials = new Credentials(
					credentialEntity,
					credentialEntity.type,
					credentialEntity.data,
				);
				const decryptedData = credentials.getData();
				oidcConfig = decryptedData as typeof oidcConfig;
			} catch (error) {
				this.logger.error('Failed to load OIDC credential', { credentialId: state.credentialId });
				res.status(500).send('Failed to load authentication configuration');
				return;
			}

			// Get discovery document
			const discovery = await getDiscoveryDocument(oidcConfig.discoveryUrl);

			// Build callback URL
			const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
			const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
			const callbackUrl = `${protocol}://${host}/rest/oidc-callback`;

			// Exchange code for tokens
			const tokenParams = new URLSearchParams({
				grant_type: 'authorization_code',
				client_id: oidcConfig.clientId,
				code,
				redirect_uri: callbackUrl,
				code_verifier: state.codeVerifier,
			});

			if (oidcConfig.clientSecret) {
				tokenParams.set('client_secret', oidcConfig.clientSecret);
			}

			const tokenResponse = await fetch(discovery.token_endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: tokenParams.toString(),
			});

			if (!tokenResponse.ok) {
				const errorText = await tokenResponse.text();
				this.logger.error('Token exchange failed', { error: errorText });
				res.status(401).send('Token exchange failed');
				return;
			}

			const tokens = (await tokenResponse.json()) as { id_token?: string; access_token?: string };

			// Validate ID token
			let userClaims: { sub: string; email?: string; name?: string } = { sub: 'unknown' };
			if (tokens.id_token) {
				try {
					const jwks = await getJwks(discovery.jwks_uri);

					// Build verification options with fallbacks from discovery document
					const verifyOptions: jose.JWTVerifyOptions = {
						// Use configured issuer or fall back to discovery document issuer
						issuer: oidcConfig.issuer || discovery.issuer,
						// Use configured audience or fall back to clientId
						audience: oidcConfig.audience || oidcConfig.clientId,
					};

					this.logger.debug('Validating ID token', {
						configuredIssuer: oidcConfig.issuer || '(using discovery)',
						configuredAudience: oidcConfig.audience || '(using clientId)',
						effectiveIssuer: verifyOptions.issuer,
						effectiveAudience: verifyOptions.audience,
					});

					const { payload } = await jose.jwtVerify(tokens.id_token, jwks, verifyOptions);

					this.logger.info('ID token claims', {
						iss: payload.iss,
						aud: payload.aud,
						sub: payload.sub,
					});

					this.logger.debug('ID token validated successfully', {
						tokenIssuer: payload.iss,
						tokenAudience: payload.aud,
						sub: payload.sub,
					});

					userClaims = {
						sub: (payload.sub as string) || 'unknown',
						email: payload.email as string | undefined,
						name: payload.name as string | undefined,
					};
				} catch (error) {
					this.logger.error('ID token validation failed', { error });
					res.status(401).send('Invalid ID token');
					return;
				}
			}

			// Create session
			const sessionDuration = (oidcConfig.sessionDurationHours || 8) * 3600;
			const now = Math.floor(Date.now() / 1000);
			const session: OidcSession = {
				sub: userClaims.sub,
				email: userClaims.email,
				name: userClaims.name,
				iat: now,
				exp: now + sessionDuration,
			};

			const sessionToken = signSession(session, oidcConfig.sessionSecret);
			const cookieName = getSessionCookieName(state.webhookPath);

			// Set session cookie and clear state cookie
			res.setHeader('Set-Cookie', [
				`${cookieName}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDuration}`,
				'n8n_oidc_state=; Path=/; HttpOnly; Max-Age=0',
			]);

			this.logger.debug('OIDC authentication successful', {
				credentialId: state.credentialId,
				userSub: userClaims.sub,
			});

			// Redirect back to original URL
			res.redirect(302, state.returnUrl);
		} catch (error) {
			this.logger.error('OIDC callback error', { error });
			res.status(500).send('Internal authentication error');
		}
	}
}
