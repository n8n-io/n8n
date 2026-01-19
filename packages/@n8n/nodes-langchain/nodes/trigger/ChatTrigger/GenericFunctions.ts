import basicAuth from 'basic-auth';
import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';
import { createHash, createHmac, randomBytes } from 'node:crypto';

import { ChatTriggerAuthorizationError } from './error';
import type { AuthenticationChatOption } from './types';

// OIDC Discovery caching
const discoveryCache = new Map<string, { doc: OidcDiscoveryDocument; expires: number }>();
const DISCOVERY_CACHE_TTL = 3600000; // 1 hour

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

interface OidcConfig {
	discoveryUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string;
	issuer: string;
	audience: string;
	sessionSecret: string;
	sessionDurationHours: number;
}

async function getDiscoveryDocument(discoveryUrl: string): Promise<OidcDiscoveryDocument> {
	const cached = discoveryCache.get(discoveryUrl);
	if (cached && cached.expires > Date.now()) {
		return cached.doc;
	}

	const response = await fetch(discoveryUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch OIDC discovery document: ${response.statusText}`);
	}

	const doc = (await response.json()) as OidcDiscoveryDocument;
	discoveryCache.set(discoveryUrl, { doc, expires: Date.now() + DISCOVERY_CACHE_TTL });
	return doc;
}

/**
 * Normalize webhook path to remove test/production prefixes
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

function parseCookies(cookieHeader: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	cookieHeader.split(';').forEach((cookie) => {
		const [name, ...rest] = cookie.trim().split('=');
		if (name) {
			cookies[name] = rest.join('=');
		}
	});
	return cookies;
}

function verifySession(token: string, secret: string): OidcSession | null {
	try {
		const [header, payload, signature] = token.split('.');
		const expectedSignature = createHmac('sha256', secret)
			.update(`${header}.${payload}`)
			.digest('base64url');

		if (signature !== expectedSignature) {
			return null;
		}

		const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as OidcSession;
		if (session.exp < Date.now() / 1000) {
			return null;
		}

		return session;
	} catch {
		return null;
	}
}

function hasValidSession(
	cookieHeader: string,
	webhookPath: string,
	sessionSecret: string,
): OidcSession | null {
	const cookieName = getSessionCookieName(webhookPath);
	const cookies = parseCookies(cookieHeader);
	const sessionToken = cookies[cookieName];

	if (!sessionToken) {
		return null;
	}

	return verifySession(sessionToken, sessionSecret);
}

async function getOidcConfig(
	context: IWebhookFunctions,
): Promise<{ config: OidcConfig; credentialId: string }> {
	const creds = await context.getCredentials<{
		discoveryUrl: string;
		clientId: string;
		clientSecret: string;
		scopes: string;
		issuer: string;
		audience: string;
		sessionSecret: string;
		sessionDurationHours: number;
	}>('oidcWebhookAuth');

	// Get credential ID from node parameters
	const nodeCredentials = context.getNode().credentials;
	const oidcCredential = nodeCredentials?.oidcWebhookAuth;
	const credentialId =
		typeof oidcCredential === 'object' && oidcCredential !== null && 'id' in oidcCredential
			? String(oidcCredential.id)
			: '';

	return {
		config: {
			discoveryUrl: creds.discoveryUrl,
			clientId: creds.clientId,
			clientSecret: creds.clientSecret || '',
			scopes: creds.scopes || 'openid profile email',
			issuer: creds.issuer || '',
			audience: creds.audience || '',
			sessionSecret: creds.sessionSecret,
			sessionDurationHours: creds.sessionDurationHours || 8,
		},
		credentialId,
	};
}

/**
 * Handle OIDC authentication for Chat Trigger
 * Uses centralized /oidc-callback endpoint for the OAuth flow
 * Returns authenticated: true if valid session exists
 * Returns handled: true if redirect was initiated (no session)
 */
export async function handleOidcAuth(
	context: IWebhookFunctions,
): Promise<{ authenticated: boolean; handled: boolean }> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();
	const headers = context.getHeaderData();
	const webhookPath = req.path;

	let oidcConfig: OidcConfig;
	let credentialId: string;
	try {
		const result = await getOidcConfig(context);
		oidcConfig = result.config;
		credentialId = result.credentialId;
	} catch {
		return { authenticated: false, handled: false };
	}

	if (!oidcConfig.discoveryUrl || !oidcConfig.clientId || !oidcConfig.sessionSecret) {
		return { authenticated: false, handled: false };
	}

	// Check for existing valid session
	const session = hasValidSession(
		(headers.cookie as string) || '',
		webhookPath,
		oidcConfig.sessionSecret,
	);
	if (session) {
		return { authenticated: true, handled: false };
	}

	// No valid session - redirect to IdP using centralized callback
	const discovery = await getDiscoveryDocument(oidcConfig.discoveryUrl);
	const csrf = randomBytes(16).toString('hex');
	const codeVerifier = randomBytes(32).toString('base64url');
	// S256: code_challenge = BASE64URL(SHA256(code_verifier))
	const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

	const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
	const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
	const originalUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

	// Use centralized callback URL
	const callbackUrl = `${protocol}://${host}/rest/oidc-callback`;

	// Store complete state in cookie for the callback controller
	const stateData = JSON.stringify({
		csrf,
		codeVerifier,
		returnUrl: originalUrl,
		credentialId,
		webhookPath,
		timestamp: Date.now(),
	});
	const stateCookie = Buffer.from(stateData).toString('base64url');

	// State sent to IdP only contains CSRF token
	const idpState = Buffer.from(JSON.stringify({ csrf })).toString('base64url');

	const authUrl = new URL(discovery.authorization_endpoint);
	authUrl.searchParams.set('client_id', oidcConfig.clientId);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('redirect_uri', callbackUrl);
	authUrl.searchParams.set('scope', oidcConfig.scopes);
	authUrl.searchParams.set('state', idpState);
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');

	res.setHeader(
		'Set-Cookie',
		`n8n_oidc_state=${stateCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
	);
	res.writeHead(302, { Location: authUrl.toString() });
	res.end();

	return { authenticated: false, handled: true };
}

export async function validateAuth(context: IWebhookFunctions) {
	const authentication = context.getNodeParameter('authentication') as AuthenticationChatOption;
	const req = context.getRequestObject();
	const headers = context.getHeaderData();

	if (authentication === 'none') {
		return;
	} else if (authentication === 'basicAuth') {
		// Basic authorization is needed to call webhook
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await context.getCredentials<ICredentialDataDecryptedObject>('httpBasicAuth');
		} catch {}

		if (expectedAuth === undefined || !expectedAuth.user || !expectedAuth.password) {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'No authentication data defined on node!');
		}

		const providedAuth = basicAuth(req);
		// Authorization data is missing
		if (!providedAuth) throw new ChatTriggerAuthorizationError(401);

		if (providedAuth.name !== expectedAuth.user || providedAuth.pass !== expectedAuth.password) {
			// Provided authentication data is wrong
			throw new ChatTriggerAuthorizationError(403);
		}
	} else if (authentication === 'n8nUserAuth') {
		const webhookName = context.getWebhookName();

		function getCookie(name: string) {
			const value = `; ${headers.cookie}`;
			const parts = value.split(`; ${name}=`);

			if (parts.length === 2) {
				return parts.pop()?.split(';').shift();
			}
			return '';
		}

		const authCookie = getCookie('n8n-auth');
		if (!authCookie && webhookName !== 'setup') {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'User not authenticated!');
		}
	} else if (authentication === 'oidcAuth') {
		// OIDC auth is handled separately via handleOidcAuth()
		// If we get here, the session should already be validated
		// This is just a fallback check
		const webhookPath = req.path;
		let oidcConfig: OidcConfig;
		try {
			const result = await getOidcConfig(context);
			oidcConfig = result.config;
		} catch {
			throw new ChatTriggerAuthorizationError(500, 'No OIDC authentication data defined on node!');
		}

		const session = hasValidSession(
			(headers.cookie as string) || '',
			webhookPath,
			oidcConfig.sessionSecret,
		);
		if (!session) {
			throw new ChatTriggerAuthorizationError(401, 'Not authenticated');
		}
	}

	return;
}
