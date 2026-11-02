import {
	InvalidGrantError,
	InvalidTargetError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { CacheService } from '@n8n/backend-services';
import {
	type N8nOAuth2Flow,
	type OAuth2FlowRequest,
	type ProtectedResource,
	ProtectedResourceRegistry,
} from '@n8n/backend-services/auth';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import {
	deriveCapabilities,
	ResourceAdmission,
	resolveOAuth2Endpoints,
	TrustedSourceStore,
	type Capability,
	type Oauth2Authentication,
	type SurfaceId,
	type TrustedSource,
} from '@n8n/inbound-auth';
import { getJwtExpiry } from '@n8n/utils/get-jwt-expiry';
import { isRecord } from '@n8n/utils/is-record';
import {
	UnexpectedError,
	UserError,
	type N8nOAuth2FlowResult,
	type N8nOAuth2RefreshResult,
} from 'n8n-workflow';
import { createHash, randomBytes } from 'node:crypto';
import pkceChallenge from 'pkce-challenge';
import { z } from 'zod';

import { SYSTEM_TRUSTED_SOURCE_ID } from '@/modules/inbound-auth-core/constants';

import { OAuthServerService } from './oauth-server.service';

const FLOW_STATE_PREFIX = 'oauth-flow:';
const FLOW_STATE_TTL = 5 * Time.minutes.toMilliseconds;
const TOKEN_REQUEST_TIMEOUT_MS = 10 * Time.seconds.toMilliseconds;
const REDIRECT_LOGIN: Capability = 'redirect-login';

type FlowState = {
	codeVerifier: string;
	resourceUrl: string;
	/** The source the flow began against. `complete` never takes it from the callback. */
	sourceId: string;
	metadata?: Record<string, string>;
};

type OAuth2Client = NonNullable<Oauth2Authentication['client']>;

/**
 * The source a trigger signs the user in at: the one its resource accepts. The resource reads
 * the trigger's `trustedSource` parameter, so the node never has to hand the id over. A resource
 * that names none accepts the instance's own server, as it did before the parameter existed.
 */
function acceptedSourceOf(resource: ProtectedResource): string {
	const accepted = resource.getAcceptedSourceIds?.() ?? [SYSTEM_TRUSTED_SOURCE_ID];
	if (accepted.length !== 1) {
		throw new UnexpectedError(
			`A redirect login needs exactly one accepted trusted source, resource ${resource.id} has ${accepted.length}`,
		);
	}
	return accepted[0];
}

/** A source that can run the redirect flow: its endpoints and the client n8n presents to it. */
type RedirectLogin = {
	source: TrustedSource;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	client: OAuth2Client;
};

type Refused = { ok: false; reason: string };

/**
 * What a trigger page holds between refreshes: the issuer's refresh token, bound to the
 * source that issued it. Opaque to the node. A binding, not a secret: the page can present
 * it only here, and from here the token goes only to the source it names.
 */
export function encodeRefreshGrant(sourceId: string, refreshToken: string): string {
	return Buffer.from(JSON.stringify({ sourceId, refreshToken })).toString('base64url');
}

export function decodeRefreshGrant(
	grant: string,
): { sourceId: string; refreshToken: string } | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(Buffer.from(grant, 'base64url').toString());
	} catch {
		return undefined;
	}
	if (
		!isRecord(parsed) ||
		typeof parsed.sourceId !== 'string' ||
		typeof parsed.refreshToken !== 'string'
	) {
		return undefined;
	}
	return { sourceId: parsed.sourceId, refreshToken: parsed.refreshToken };
}

type IssuedTokens = {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
};

// RFC 6749 §5.1: `access_token` is the one field every issuer returns.
const TokenResponseSchema = z
	.object({
		access_token: z.string().min(1),
		expires_in: z.number().int().positive().optional(),
		refresh_token: z.string().min(1).optional(),
	})
	.passthrough();

/** The `error` code of an RFC 6749 §5.2 error response, when the body carries one. */
function tokenErrorCode(body: unknown): string | undefined {
	return isRecord(body) && typeof body.error === 'string' ? body.error : undefined;
}

/**
 * Seconds until the token's own `exp`, for an issuer that omits `expires_in`. The pipeline
 * verified the token already, so the payload is read without a signature check.
 */
function secondsUntilExpiry(token: string): number | undefined {
	const exp = getJwtExpiry(token);
	return exp === undefined ? undefined : Math.max(0, exp - Math.floor(Date.now() / 1000));
}

@Service()
export class OAuth2FlowService implements N8nOAuth2Flow {
	private readonly http: HttpRequestClient;

	private readonly logger: Logger;

	constructor(
		private readonly oauthServerService: OAuthServerService,
		private readonly resourceRegistry: ProtectedResourceRegistry,
		private readonly cacheService: CacheService,
		private readonly store: TrustedSourceStore,
		private readonly admission: ResourceAdmission,
		outboundHttp: OutboundHttp,
		logger: Logger,
	) {
		// A token endpoint comes from an admin-supplied issuer: the guard runs even when the
		// instance flag is off, as it does for discovery.
		this.http = outboundHttp.requests({
			useDefaultSsrfPolicy: 'enforced',
			timeout: TOKEN_REQUEST_TIMEOUT_MS,
		});
		this.logger = logger.scoped('inbound-auth');
	}

	/**
	 * Begin authorization-code + PKCE for a trigger: validate the resource is first-party,
	 * load the trusted source the resource accepts, stash the PKCE verifier under an
	 * unguessable single-use `state`, and return the source's authorization URL to redirect
	 * the browser to. The redirect URI and the resource are the trigger URL. With a
	 * virtual client the client id is the trigger URL too; with a registered client it is
	 * the one the source holds.
	 *
	 * Optional `metadata` is stashed against the `state` (server-side, never sent to the
	 * browser) and handed back by `complete` on success.
	 *
	 * A source without the `redirect-login` capability, or one not accepted on the
	 * resource's surface, is refused here, before any redirect.
	 */
	async begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string> {
		const resource = await this.resourceRegistry.getByResourceUrl(resourceUrl);
		if (!resource?.isFirstParty) {
			throw new UserError(`Not a first-party protected resource: ${resourceUrl}`);
		}

		const login = await this.redirectLoginOf(acceptedSourceOf(resource), resource.surface);
		if (!login.ok) throw new UserError(login.reason);
		const { source, authorizationEndpoint, client } = login.value;

		const { code_verifier, code_challenge } = await pkceChallenge();
		const state = randomBytes(32).toString('hex');
		await this.cacheService.set(
			FLOW_STATE_PREFIX + state,
			{
				codeVerifier: code_verifier,
				resourceUrl,
				sourceId: source.id,
				metadata,
			} satisfies FlowState,
			FLOW_STATE_TTL,
		);

		const url = new URL(authorizationEndpoint);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('client_id', client.kind === 'virtual' ? resourceUrl : client.clientId);
		url.searchParams.set('redirect_uri', resourceUrl);
		url.searchParams.set('resource', resourceUrl);
		url.searchParams.set('code_challenge', code_challenge);
		url.searchParams.set('code_challenge_method', 'S256');
		url.searchParams.set('state', state);
		if (client.kind === 'registered' && client.scopes?.length) {
			url.searchParams.set('scope', client.scopes.join(' '));
		}
		return url.toString();
	}

	/**
	 * Complete the flow: consume the cached state once, exchange the code at the source the
	 * flow began against, and verify the access token through the inbound authentication
	 * pipeline against the trigger's resource. Ends with a verified token and the n8n user
	 * the source's identity rules resolved it to.
	 *
	 * The resource must still accept the source the flow began against: a trigger whose
	 * selection changed mid-flow restarts it. `request` describes the callback request and
	 * travels into the verified result; the token never comes from it.
	 */
	async complete(
		code: string,
		state: string,
		request?: OAuth2FlowRequest,
	): Promise<N8nOAuth2FlowResult> {
		const cacheKey = FLOW_STATE_PREFIX + state;
		const flow = await this.cacheService.get<FlowState>(cacheKey);
		if (!flow) return { valid: false, reason: 'invalid_state' };
		await this.cacheService.delete(cacheKey); // consume-once

		const { codeVerifier, resourceUrl, sourceId, metadata } = flow;

		const resource = await this.resourceRegistry.getByResourceUrl(resourceUrl);
		if (!resource?.isFirstParty) return { valid: false, reason: 'invalid_client' };

		const accepted = acceptedSourceOf(resource);
		if (accepted !== sourceId) {
			this.logger.warn('Redirect login completed against another trusted source than it began', {
				began: sourceId,
				accepted,
			});
			return { valid: false, reason: 'invalid_state' };
		}

		const login = await this.redirectLoginOf(sourceId, resource.surface);
		if (!login.ok) {
			this.logger.warn('Redirect login cannot complete', { sourceId, reason: login.reason });
			return { valid: false, reason: 'source_unusable' };
		}

		const issued =
			login.value.client.kind === 'virtual'
				? await this.exchangeWithVirtualClient(resourceUrl, code, codeVerifier)
				: await this.exchangeWithRegisteredClient(login.value, resourceUrl, code, codeVerifier);
		if (!issued.ok) return { valid: false, reason: issued.reason };
		const tokens = issued.value;

		const admitted = await this.admission.admitBearer(
			resource,
			{
				method: request?.method ?? 'GET',
				url: request?.url ?? resourceUrl,
				ip: request?.ip ?? '',
			},
			tokens.accessToken,
		);
		if (!admitted.ok) return { valid: false, reason: admitted.reason };
		const { context } = admitted;

		// The issuer reports the lifetime; the token's own `exp` stands in when it does not.
		// Without either, a page could not schedule a refresh and would silently stop working,
		// so restart the flow now instead.
		const expiresIn = tokens.expiresIn ?? secondsUntilExpiry(tokens.accessToken);
		if (expiresIn === undefined) return { valid: false, reason: 'invalid_grant' };

		const { subject } = context;
		return {
			valid: true,
			token: tokens.accessToken,
			refreshToken:
				tokens.refreshToken === undefined
					? undefined
					: encodeRefreshGrant(sourceId, tokens.refreshToken),
			expiresIn,
			user: {
				id: subject.id,
				email: subject.email ?? '',
				firstName: subject.firstName ?? '',
				lastName: subject.lastName ?? '',
			},
			metadata,
		};
	}

	/**
	 * Rotate a trigger's grant at the source that issued it: in process on the virtual client
	 * at the internal server, or over HTTP at a registered source (RFC 6749 §6) with the
	 * RFC 8707 resource. The resource must still accept that source, as `complete` requires
	 * of the source a flow began against: a trigger whose selection changed restarts the login
	 * instead of presenting one source's token to another.
	 */
	async refresh(grant: string, resourceUrl: string): Promise<N8nOAuth2RefreshResult> {
		const resource = await this.resourceRegistry.getByResourceUrl(resourceUrl);
		if (!resource?.isFirstParty) {
			throw new UserError(`Not a first-party protected resource: ${resourceUrl}`);
		}

		const issued = decodeRefreshGrant(grant);
		if (!issued) return { valid: false, reason: 'invalid_grant' };

		const accepted = acceptedSourceOf(resource);
		if (issued.sourceId !== accepted) {
			this.logger.warn('Refresh grant presented against another trusted source than issued it', {
				issued: issued.sourceId,
				accepted,
			});
			return { valid: false, reason: 'invalid_grant' };
		}

		const login = await this.redirectLoginOf(accepted, resource.surface);
		if (!login.ok) {
			this.logger.warn('Redirect login cannot refresh', { reason: login.reason });
			return { valid: false, reason: 'source_unusable' };
		}

		const refreshed =
			login.value.client.kind === 'virtual'
				? await this.refreshWithVirtualClient(issued.refreshToken, resourceUrl)
				: await this.refreshWithRegisteredClient(login.value, issued.refreshToken, resourceUrl);
		if (!refreshed.valid) return refreshed;
		return { ...refreshed, refreshToken: encodeRefreshGrant(accepted, refreshed.refreshToken) };
	}

	/** The internal server's rotation, in process, on the trigger's virtual client. */
	private async refreshWithVirtualClient(
		refreshToken: string,
		resourceUrl: string,
	): Promise<N8nOAuth2RefreshResult> {
		const client = await this.oauthServerService.clientsStore.getClient(resourceUrl);
		if (!client) return { valid: false, reason: 'invalid_client' };

		try {
			const tokens = await this.oauthServerService.exchangeRefreshToken(
				client,
				refreshToken,
				undefined,
				new URL(resourceUrl),
			);
			if (!tokens.refresh_token || tokens.expires_in === undefined) {
				return { valid: false, reason: 'invalid_grant' };
			}
			return {
				valid: true,
				token: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresIn: tokens.expires_in,
			};
		} catch (error) {
			// A token already consumed by a concurrent refresh loses the atomic
			// `deleteValidByToken` race and arrives here; so does a request naming a
			// resource outside the grant. Both are the caller's cue to restart the flow,
			// not a server fault — surface them on the union, never as a silent reuse.
			if (error instanceof InvalidGrantError || error instanceof InvalidTargetError) {
				return { valid: false, reason: 'invalid_grant' };
			}
			throw error;
		}
	}

	/**
	 * An external issuer's rotation, over HTTP. An issuer that rotates no refresh token keeps
	 * the presented one valid (§6), so that one is handed back for the next refresh.
	 */
	private async refreshWithRegisteredClient(
		login: RedirectLogin,
		refreshToken: string,
		resourceUrl: string,
	): Promise<N8nOAuth2RefreshResult> {
		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			resource: resourceUrl,
		});
		const issued = await this.requestTokens(login, body, 'refresh token');
		if (!issued.ok) return { valid: false, reason: issued.reason };

		const { accessToken } = issued.value;
		const expiresIn = issued.value.expiresIn ?? secondsUntilExpiry(accessToken);
		if (expiresIn === undefined) return { valid: false, reason: 'invalid_grant' };

		return {
			valid: true,
			token: accessToken,
			refreshToken: issued.value.refreshToken ?? refreshToken,
			expiresIn,
		};
	}

	/**
	 * The source as the redirect flow needs it. Refused with a reason that names what is
	 * missing: the source, its acceptance on the surface, or the `redirect-login` capability.
	 */
	private async redirectLoginOf(
		sourceId: string,
		surface: SurfaceId,
	): Promise<{ ok: true; value: RedirectLogin } | Refused> {
		const source = await this.store.getById(sourceId);
		if (!source) return { ok: false, reason: `Unknown trusted source: ${sourceId}` };

		if (source.config.surfaces[surface] === undefined) {
			return {
				ok: false,
				reason: `Trusted source "${source.name}" is not accepted on the ${surface} surface`,
			};
		}

		if (!deriveCapabilities(source.config, source.metadata).has(REDIRECT_LOGIN)) {
			return {
				ok: false,
				reason: `Trusted source "${source.name}" has no ${REDIRECT_LOGIN} capability: it needs an authorization endpoint, a token endpoint and a client`,
			};
		}

		const { authentication } = source.config;
		const { authorizationEndpoint, tokenEndpoint } = resolveOAuth2Endpoints(
			source.config,
			source.metadata?.documents ?? [],
		);
		// The capability holds only when all three exist; this narrows the types.
		if (
			authentication.type !== 'oauth2' ||
			!authentication.client ||
			!authorizationEndpoint ||
			!tokenEndpoint
		) {
			throw new UnexpectedError(
				`Trusted source ${source.id} has ${REDIRECT_LOGIN} without its endpoints`,
			);
		}

		return {
			ok: true,
			value: { source, authorizationEndpoint, tokenEndpoint, client: authentication.client },
		};
	}

	/**
	 * The internal server's exchange, in process: verify PKCE (the SDK token handler
	 * normally does this — we exchange in-process, so replicate the S256 check), then
	 * exchange the code on the trigger's virtual client.
	 */
	private async exchangeWithVirtualClient(
		resourceUrl: string,
		code: string,
		codeVerifier: string,
	): Promise<{ ok: true; value: IssuedTokens } | Refused> {
		const client = await this.oauthServerService.clientsStore.getClient(resourceUrl);
		if (!client) return { ok: false, reason: 'invalid_client' };

		try {
			const challenge = await this.oauthServerService.challengeForAuthorizationCode(client, code);
			if (createHash('sha256').update(codeVerifier).digest('base64url') !== challenge) {
				return { ok: false, reason: 'invalid_grant' };
			}

			const tokens = await this.oauthServerService.exchangeAuthorizationCode(
				client,
				code,
				codeVerifier,
				resourceUrl,
				new URL(resourceUrl),
			);
			return {
				ok: true,
				value: {
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
					expiresIn: tokens.expires_in,
				},
			};
		} catch (error) {
			// A concurrent completion (double-submitted callback) loses the atomic
			// `markAuthorizationCodeAsUsed` race; a missing/used/expired code throws the
			// same way. Surface it as a graceful invalid_grant rather than a thrown 500 —
			// the return contract is a discriminated union, not an exception channel.
			if (error instanceof InvalidGrantError) {
				return { ok: false, reason: 'invalid_grant' };
			}
			throw error;
		}
	}

	/**
	 * An external issuer's exchange, over HTTP: RFC 6749 §4.1.3 with the PKCE verifier
	 * and the RFC 8707 resource.
	 */
	private async exchangeWithRegisteredClient(
		login: RedirectLogin,
		resourceUrl: string,
		code: string,
		codeVerifier: string,
	): Promise<{ ok: true; value: IssuedTokens } | Refused> {
		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: resourceUrl,
			code_verifier: codeVerifier,
			resource: resourceUrl,
		});
		return await this.requestTokens(login, body, 'authorization code');
	}

	/**
	 * One token request at the source's endpoint. A confidential client authenticates with
	 * HTTP Basic (§2.3.1), a public one names itself in the body. `grant` names what was
	 * presented, for the log line.
	 */
	private async requestTokens(
		{ source, tokenEndpoint, client }: RedirectLogin,
		body: URLSearchParams,
		grant: string,
	): Promise<{ ok: true; value: IssuedTokens } | Refused> {
		if (client.kind !== 'registered') {
			throw new UnexpectedError('A virtual client cannot request tokens over HTTP');
		}

		const headers: Record<string, string> = {
			'content-type': 'application/x-www-form-urlencoded',
			accept: 'application/json',
		};
		if (client.clientSecret) {
			const credentials = `${encodeURIComponent(client.clientId)}:${encodeURIComponent(client.clientSecret)}`;
			headers.authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
		} else {
			body.set('client_id', client.clientId);
		}

		const response = await this.http.request<unknown>({
			url: tokenEndpoint,
			method: 'POST',
			headers,
			body: body.toString(),
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});

		if (response.statusCode < 200 || response.statusCode >= 300) {
			this.logger.warn(`Token endpoint refused the ${grant}`, {
				sourceId: source.id,
				status: response.statusCode,
				error: tokenErrorCode(response.body),
			});
			return { ok: false, reason: 'invalid_grant' };
		}

		const parsed = TokenResponseSchema.safeParse(response.body);
		if (!parsed.success) {
			this.logger.warn('Token endpoint answered without an access token', {
				sourceId: source.id,
			});
			return { ok: false, reason: 'invalid_grant' };
		}

		return {
			ok: true,
			value: {
				accessToken: parsed.data.access_token,
				refreshToken: parsed.data.refresh_token,
				expiresIn: parsed.data.expires_in,
			},
		};
	}
}
