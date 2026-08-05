import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient, isHttpRequestError } from '@n8n/backend-network';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';
import { UrlService } from '@/services/url.service';

/**
 * Fallback root-level token endpoint (no `/rest` prefix), used only when the
 * target isn't an n8n-served protected resource and discovery can't find an
 * advertised endpoint; mirrors the inbound proof runbook.
 */
const TOKEN_ENDPOINT_PATH = '/oauth/token';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Mints a short-lived OAuth2 access token *as a given service-account user* by making
 * an HTTP `client_credentials` self-call to the token endpoint discovered from n8n's
 * own OAuth2 metadata.
 *
 * The transport is pure OAuth2 discovery: the outbound target URL is resolved through
 * RFC 9728 protected-resource metadata (→ canonical `resource` + authorization server)
 * then RFC 8414 authorization-server metadata (→ `token_endpoint`), so the mint uses
 * what the resource/AS actually advertise rather than a guessed endpoint. When the
 * target isn't an n8n-served protected resource, it falls back to the instance token
 * endpoint with the raw target URL as the audience.
 *
 * This is the outbound half of the service-account identity story: an autonomous agent
 * run threads its acting service-account user id here, we recover that SA's client
 * credentials, and mint a token audience-locked to the discovered canonical resource.
 *
 * The acting identity comes only from server-side execution context (the `userId`
 * argument), never from node input — the caller is responsible for that guarantee.
 */
@Service()
export class InternalOAuth2MintService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly serviceAccountCredentialService: ServiceAccountCredentialService,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			ssrf: 'disabled', // Fixed, n8n-controlled host (this instance's own token endpoint).
			timeout: REQUEST_TIMEOUT_MS,
		});
	}

	/**
	 * Mint a bearer access token for `userId`, audience-locked to `targetUrl`.
	 *
	 * @throws OperationalError when the user has no service-account credential, or when
	 * the token endpoint call fails (network error or non-2xx). The client secret is
	 * never included in the thrown error.
	 */
	async mintForUser(
		userId: string,
		targetUrl: string,
		ctx: OperationContext = {},
	): Promise<string> {
		const credential = await this.serviceAccountCredentialService.getDecryptedForUser(userId, ctx);
		if (!credential) {
			this.emitOutcome(userId, '', targetUrl, 'failure');
			throw new OperationalError('No service-account credential for identity');
		}

		const { clientId, clientSecret } = credential;

		// Discover the token endpoint + canonical resource from n8n's own OAuth2
		// metadata (RFC 9728 → 8414) rather than guessing the endpoint.
		let tokenEndpoint: string;
		let resource: string;
		try {
			const resolved = await this.resolveResourceAuth(targetUrl);
			tokenEndpoint = resolved.tokenEndpoint;
			resource = resolved.resourceId;
			// Trace: which resource + authorization server we discovered for this target.
			this.logger.info('Discovered protected resource and authorization server', {
				targetUrl,
				resource,
				authServerIssuer: resolved.authServerIssuer,
				tokenEndpoint,
			});
			// TODO: confused-deputy guard — validate the discovered `resource` equals the target we intend to call before minting (RFC 9728 §7). Deferred for the internal PoC (single AS, resource == called URL).
			// TODO: select the client credential by the discovered AS issuer once credentials are bound per-AS; today we always use the acting service account's internal credential.
		} catch {
			// Fallback: the target isn't an n8n-served protected resource (discovery
			// failed), so mint against the instance's own token endpoint with the raw
			// target URL as the audience. Keeps non-n8n / unregistered targets working.
			this.logger.warn('OAuth2 discovery failed; falling back to instance token endpoint', {
				targetUrl,
			});
			tokenEndpoint = `${this.urlService.getInstanceBaseUrl()}${TOKEN_ENDPOINT_PATH}`;
			resource = targetUrl;
		}

		const body = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
			resource,
		});

		// TODO: external AS support — flip OutboundHttp ssrf off-'disabled' to the egress filter + validate the issuer against the credential's AS binding before sending the secret. Internal-only today.
		let accessToken: string | undefined;
		try {
			const response = await this.http.request<{ access_token?: string }>({
				url: tokenEndpoint,
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: body.toString(),
			});
			accessToken = response?.access_token;
		} catch (error) {
			// Only surface the HTTP status — never the request body, which carries the secret.
			const status = isHttpRequestError(error) ? error.response?.status : undefined;
			this.logger.warn('Failed to mint service-account token', { userId, targetUrl, status });
			this.emitOutcome(userId, clientId, resource, 'failure');
			throw new OperationalError('Failed to mint service-account token');
		}

		if (!accessToken) {
			this.emitOutcome(userId, clientId, resource, 'failure');
			throw new OperationalError('Token endpoint returned no access_token');
		}

		// Trace: the acting identity self-authenticated and now holds a token for `resource`.
		this.logger.info('Service account self-authenticated (internal OAuth2 mint)', {
			userId,
			clientId,
			resource,
			tokenEndpoint,
		});
		this.emitOutcome(userId, clientId, resource, 'success');
		return accessToken;
	}

	/**
	 * Resolve the token endpoint and canonical resource for `targetUrl` from n8n's
	 * own already-served OAuth2 metadata.
	 *
	 * RFC 9728 §3.1 path-suffix form: the protected-resource metadata lives at
	 * `{origin}/.well-known/oauth-protected-resource{path}{query}`. Its `resource`
	 * is the canonical audience and `authorization_servers[0]` is the issuer, whose
	 * RFC 8414 metadata advertises the `token_endpoint`.
	 *
	 * @throws OperationalError when either metadata document is missing or malformed.
	 * Network / non-2xx failures reject from the HTTP client; the caller treats any
	 * throw as "not an n8n-served protected resource" and falls back.
	 */
	private async resolveResourceAuth(
		targetUrl: string,
	): Promise<{ resourceId: string; tokenEndpoint: string; authServerIssuer: string }> {
		const target = new URL(targetUrl);
		// Insert the well-known segment between origin and the resource's path,
		// preserving any query string the resource resolver keys on (e.g. `?method=`).
		const prmUrl = `${target.origin}/.well-known/oauth-protected-resource${target.pathname}${target.search}`;

		const prm = await this.http.request<{
			resource?: string;
			authorization_servers?: string[];
		}>({ url: prmUrl, method: 'GET' });

		const resourceId = prm?.resource;
		const authServerIssuer = prm?.authorization_servers?.[0];
		if (!resourceId || !authServerIssuer) {
			throw new OperationalError(
				'Protected-resource metadata missing resource or authorization server',
			);
		}

		// Trace: RFC 9728 protected-resource metadata step of discovery.
		this.logger.debug('Fetched protected-resource metadata', {
			prmUrl,
			resource: resourceId,
			issuer: authServerIssuer,
		});

		const asMetadata = await this.http.request<{ token_endpoint?: string }>({
			url: `${authServerIssuer}/.well-known/oauth-authorization-server`,
			method: 'GET',
		});

		const tokenEndpoint = asMetadata?.token_endpoint;
		if (!tokenEndpoint) {
			throw new OperationalError('Authorization-server metadata missing token_endpoint');
		}

		// Trace: RFC 8414 authorization-server metadata step of discovery.
		this.logger.debug('Fetched authorization-server metadata', {
			issuer: authServerIssuer,
			tokenEndpoint,
		});

		return { resourceId, tokenEndpoint, authServerIssuer };
	}

	private emitOutcome(
		userId: string,
		clientId: string,
		targetUrl: string,
		outcome: 'success' | 'failure',
	): void {
		this.eventService.emit('service-account-token-minted', {
			sub: userId,
			clientId,
			aud: targetUrl,
			outcome,
		});
	}
}
