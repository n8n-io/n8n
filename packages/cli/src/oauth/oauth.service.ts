import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService, type HttpRequestClient } from '@n8n/backend-network';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import Csrf from 'csrf';
import type { Request, Response } from 'express';
import { Credentials, Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { jsonParse, OperationalError, UnexpectedError } from 'n8n-workflow';

import {
	GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { AuthService } from '@/auth/auth.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { OAuthRequest } from '@/requests';
import { validateOAuthUrl } from '@/oauth/validate-oauth-url';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import {
	ClientOAuth2,
	type ClientOAuth2Options,
	type ClientOAuth2TokenData,
	type OAuth2AuthenticationMethod,
	type OAuth2CredentialData,
	type OAuth2GrantType,
} from '@n8n/client-oauth2';
import {
	oAuthAuthorizationServerMetadataSchema,
	dynamicClientRegistrationResponseSchema,
} from '@/controllers/oauth/oauth2-dynamic-client-registration.schema';
import pkceChallenge from 'pkce-challenge';
import * as qs from 'querystring';
import split from 'lodash/split';
import { ExternalHooks } from '@/external-hooks';
import { createHmac } from 'crypto';
import type { RequestOptions } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';
import {
	algorithmMap,
	MAX_CSRF_AGE,
	OauthVersion,
	type CreateCsrfStateData,
	type CsrfState,
	type OAuth1CredentialData,
} from './types';
import { CredentialStoreMetadata } from '@/credentials/dynamic-credential-storage.interface';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { EventService } from '@/events/event.service';
import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';
import { OAuthBrowserBindingService } from '@/oauth/oauth-browser-binding.service';
import { CacheService } from '@/services/cache/cache.service';
import { Time } from '@n8n/constants';

/**
 * Per-flow OAuth state stored in CacheService, keyed by the CSRF state token.
 * Lives only for the duration of an in-flight OAuth handshake.
 */
export type OauthFlowState = {
	csrfSecret: string;
	/**
	 * The CSRF state payload (credential id, origin, user identity, browser
	 * binding hash, and for dynamic credentials the caller's bearer token).
	 * Held here instead of encrypted in the `state` URL parameter so the
	 * authorization URL stays small. Optional so flows started before this
	 * change (which carried the payload in the URL) still resolve.
	 */
	stateData?: CreateCsrfStateData;
	/** OAuth2 PKCE verifier, needed to exchange the code in the callback. */
	codeVerifier?: string;
	/** OAuth1 request-token secret, needed to sign the access-token request in the callback. */
	oauthTokenSecret?: string;
};

const OAUTH_FLOW_CACHE_PREFIX = 'oauth:flow:';
const OAUTH_REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds; // This might be added to a OAuth Config (there is currently none)

export function shouldSkipAuthOnOAuthCallback() {
	const value = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK?.toLowerCase() ?? 'false';
	return value === 'true';
}

export const skipAuthOnOAuthCallback = shouldSkipAuthOnOAuthCallback();

export { OauthVersion, type OAuth1CredentialData, type CreateCsrfStateData, type CsrfState };

export class InvalidTargetError extends BadRequestError {
	constructor(message: string) {
		super(message, undefined, 'invalid_target');
		this.name = 'InvalidTargetError';
	}
}

export class InvalidOAuthUrlError extends BadRequestError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidOAuthUrlError';
	}
}

@Service()
export class OauthService {
	constructor(
		protected readonly logger: Logger,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly externalHooks: ExternalHooks,
		private readonly cipher: Cipher,
		private readonly dynamicCredentialsProxy: DynamicCredentialsProxy,
		private readonly authService: AuthService,
		private readonly oauthJweServiceProxy: OAuthJweServiceProxy,
		private readonly browserBindingService: OAuthBrowserBindingService,
		private readonly eventService: EventService,
		private readonly cacheService: CacheService,
		outboundHttp: OutboundHttp,
		ssrfProtectionService: SsrfProtectionService,
		ssrfProtectionConfig: SsrfProtectionConfig,
	) {
		// Unlike most OutboundHttp callsites, here we opt into SSRF protection (when the environment enables it) because the attack risk is higher:
		// these URLs can be user-, instance- or remote-server-supplied (discovery / dynamic client registration),
		// so the service can't tell at runtime which are trustworthy.
		// Self-hosted users with an internal OAuth/MCP server are accommodated via the SSRF allowlist config, not by disabling the guard.
		// In the future, enabling SSRF "per feature" could be refined through configuration.
		this.http = outboundHttp.requests({
			ssrf: ssrfProtectionConfig.enabled ? ssrfProtectionService : 'disabled',
		});
	}

	private readonly http: HttpRequestClient;

	private oauthFlowCacheKey(token: string): string {
		return `${OAUTH_FLOW_CACHE_PREFIX}${token}`;
	}

	private validateOAuthUrlOrThrow(url: string): void {
		try {
			validateOAuthUrl(url);
		} catch (e) {
			this.logger.error('Invalid OAuth URL', { url, error: e });
			throw e;
		}
	}

	private validateAuthServerUrlOrThrow(url: string): void {
		// NOTE: validateOAuthUrl silently passes undefined/empty strings,
		// but we only call this with a non-empty string from a length‑guarded
		// authorization_servers array. This call is defense‑in‑depth.
		try {
			this.validateOAuthUrlOrThrow(url);
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw new InvalidOAuthUrlError(error.message);
			}
			throw error;
		}
	}

	/**
	 * Normalizes a resource URL by removing trailing slashes.
	 *
	 * RFC 8707 treats the resource indicator as an opaque identifier, and in
	 * theory servers could differentiate between https://example.com and
	 * https://example.com/. In practice, MCP servers consistently treat them as
	 * equivalent, and the n8n server‑side OAuth fix (PR #30558) already applies
	 * the same normalization. We follow that precedent to avoid false mismatches
	 * when users inadvertently add a trailing slash.
	 *
	 * If a real‑world server is discovered that requires exact preservation of
	 * a trailing slash, this normalization should be revisited.
	 *
	 */
	private normalizeResourceUrl(url: string): string {
		return url.trim().replace(/\/+$/, '');
	}

	private parseUrlOriginOrThrow(url: string, message: string): string {
		try {
			return new URL(url).origin;
		} catch (error) {
			this.logger.debug('Invalid OAuth URL format', { url, error });
			throw new InvalidTargetError(message);
		}
	}

	private validateResourceUrlOrThrow(resourceUrl: string): string {
		const normalizedResourceUrl = this.normalizeResourceUrl(resourceUrl);

		try {
			this.validateOAuthUrlOrThrow(normalizedResourceUrl);
			new URL(normalizedResourceUrl);
		} catch (error) {
			this.logger.debug('Invalid OAuth resource URL', { resourceUrl, error });
			throw new InvalidTargetError('Invalid resource URL format.');
		}

		return normalizedResourceUrl;
	}

	private resolveResourceUrl(
		suppliedResourceUrl: string | undefined,
		discoveredResource: string | undefined,
		serverUrl: string,
	): string | undefined {
		if (!suppliedResourceUrl) return discoveredResource;

		if (discoveredResource && suppliedResourceUrl !== discoveredResource) {
			this.logger.debug('OAuth resource URL does not match discovered resource', {
				suppliedResourceUrl,
				discoveredResource,
			});
			throw new InvalidTargetError(
				"The provided resource URL does not match the server's advertised resource.",
			);
		}

		if (!discoveredResource) {
			const resourceOrigin = this.parseUrlOriginOrThrow(
				suppliedResourceUrl,
				'Invalid resource URL format.',
			);
			const serverOrigin = this.parseUrlOriginOrThrow(
				serverUrl,
				'Invalid OAuth server URL format.',
			);

			if (resourceOrigin !== serverOrigin) {
				this.logger.debug('OAuth resource URL origin does not match server URL origin', {
					resourceOrigin,
					serverOrigin,
				});
				throw new InvalidTargetError('Resource URL origin must match the server URL origin.');
			}
		}

		return suppliedResourceUrl;
	}

	getBaseUrl(oauthVersion: OauthVersion) {
		const restUrl = `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}`;
		return `${restUrl}/oauth${oauthVersion}-credential`;
	}

	async getCredentialForUpdate(
		req: OAuthRequest.OAuth1Credential.Auth | OAuthRequest.OAuth2Credential.Auth,
	): Promise<CredentialsEntity> {
		const { id: credentialId } = req.query;

		if (!credentialId) {
			throw new BadRequestError('Required credential ID is missing');
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:update'],
		);

		if (!credential) {
			this.logger.error(
				'OAuth credential authorization failed because the current user does not have the correct permissions',
				{ userId: req.user.id, credentialId },
			);
			throw new NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
		}

		return credential;
	}

	async buildCsrfStateData(
		credential: CredentialsEntity,
		req: OAuthRequest.OAuth1Credential.Auth | OAuthRequest.OAuth2Credential.Auth,
	): Promise<CreateCsrfStateData> {
		if (credential.isResolvable) {
			const resolverId = this.dynamicCredentialsProxy.getSystemResolverId();
			if (resolverId !== null) {
				const cookieToken = this.authService.getCookieToken(req as Request);
				if (cookieToken) {
					return {
						cid: credential.id,
						origin: 'dynamic-credential',
						userId: req.user.id,
						credentialResolverId: resolverId,
						authorizationHeader: `Bearer ${cookieToken}`,
						authMetadata: { source: 'manual-execution' },
					};
				}
			}
		}
		return {
			cid: credential.id,
			origin: 'static-credential',
			userId: req.user.id,
		};
	}

	protected async getAdditionalData() {
		return await WorkflowExecuteAdditionalData.getBase();
	}

	/**
	 * Allow decrypted data to evaluate expressions that include $secrets and apply overwrites
	 */
	protected async getDecryptedDataForAuthUri(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return await this.getDecryptedData(credential, additionalData, false);
	}

	/**
	 * Do not apply overwrites here because that removes the CSRF state, and breaks the oauth flow
	 */
	protected async getDecryptedDataForCallback(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return await this.getDecryptedData(credential, additionalData, true);
	}

	private async getDecryptedData(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
		raw: boolean,
	) {
		return await this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			credential.type,
			'internal',
			undefined,
			raw,
		);
	}

	protected async applyDefaultsAndOverwrites<T>(
		credential: ICredentialsDb,
		decryptedData: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return (await this.credentialsHelper.applyDefaultsAndOverwrites(
			additionalData,
			decryptedData,
			credential.type,
			'internal',
			undefined,
			undefined,
		)) as unknown as T;
	}

	async encryptAndSaveData(
		credential: ICredentialsDb,
		toUpdate: ICredentialDataDecryptedObject,
		toDelete: string[] = [],
	) {
		if (toUpdate.oauthTokenData && typeof toUpdate.oauthTokenData === 'object') {
			const identifier = OauthService.extractAccountIdentifier(
				toUpdate.oauthTokenData as Record<string, unknown>,
			);
			if (identifier) {
				toUpdate.accountIdentifier = identifier;
			}
		}

		const credentials = new Credentials(credential, credential.type, credential.data);
		await credentials.updateData(toUpdate, toDelete);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	static extractAccountIdentifier(tokenData: Record<string, unknown>): string | undefined {
		for (const key of ['email', 'login', 'username', 'user', 'account']) {
			if (typeof tokenData[key] === 'string' && tokenData[key]) {
				return tokenData[key];
			}
		}

		if (typeof tokenData.id_token === 'string') {
			const parts = tokenData.id_token.split('.');
			if (parts.length === 3) {
				try {
					const payload: Record<string, unknown> = JSON.parse(
						Buffer.from(parts[1], 'base64url').toString(),
					);
					if (typeof payload.email === 'string' && payload.email) {
						return payload.email;
					}
					if (typeof payload.preferred_username === 'string' && payload.preferred_username) {
						return payload.preferred_username;
					}
				} catch {}
			}
		}

		const authedUser = tokenData.authed_user;
		if (authedUser && typeof authedUser === 'object') {
			const user = authedUser as Record<string, unknown>;
			if (typeof user.id === 'string' && user.id) {
				return user.id;
			}
		}

		return undefined;
	}

	/** Get a credential without user check */
	protected async getCredentialWithoutUser(
		credentialId: string,
	): Promise<CredentialsEntity | null> {
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	/**
	 * Mint a CSRF secret and the matching `state` URL parameter. The state carries
	 * only the signed token and a timestamp — the rest of the flow payload is stashed
	 * server-side in the per-flow cache (see {@link storeOauthFlowState}) so the
	 * authorization URL does not balloon with an encrypted blob.
	 */
	async createCsrfState(): Promise<[string, string, string]> {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const stateToken = token.create(csrfSecret);
		const state: CsrfState = {
			token: stateToken,
			createdAt: Date.now(),
		};

		const base64State = Buffer.from(JSON.stringify(state)).toString('base64');
		return [csrfSecret, base64State, stateToken];
	}

	/**
	 * Stash per-flow OAuth state (CSRF secret + optional PKCE verifier) in the cache
	 * keyed by the CSRF state token. Replaces the previous behavior of writing this
	 * state to the shared CredentialsEntity.data — which races when multiple users
	 * initiate OAuth against the same credential blueprint.
	 */
	async storeOauthFlowState(stateToken: string, flowState: OauthFlowState): Promise<void> {
		await this.cacheService.set(this.oauthFlowCacheKey(stateToken), flowState, MAX_CSRF_AGE);
	}

	/**
	 * Read the per-flow OAuth state without consuming it. Used while decoding the
	 * callback `state` to recover the payload that used to live in the URL; the
	 * entry is still consumed (deleted) later by {@link consumeOauthFlowState}.
	 */
	protected async peekOauthFlowState(stateToken: string): Promise<OauthFlowState | undefined> {
		return await this.cacheService.get<OauthFlowState>(this.oauthFlowCacheKey(stateToken));
	}

	/**
	 * Read and consume the per-flow OAuth state. Consume-once: the entry is deleted
	 * after a successful read to prevent replay.
	 */
	async consumeOauthFlowState(stateToken: string): Promise<OauthFlowState | undefined> {
		const key = this.oauthFlowCacheKey(stateToken);
		const value = await this.cacheService.get<OauthFlowState>(key);
		if (value === undefined) return undefined;
		await this.cacheService.delete(key);
		return value;
	}

	protected async decodeCsrfState(
		encodedState: string,
		req: AuthenticatedRequest,
	): Promise<[CsrfState & CreateCsrfStateData, CredentialsEntity | null]> {
		const errorMessage = 'Invalid state format';
		const decodedState = Buffer.from(encodedState, 'base64').toString();
		const decoded = jsonParse<CsrfState>(decodedState, {
			errorMessage,
		});

		// The CSRF state payload now lives server-side in the per-flow cache (keyed
		// by the state token). Fall back to the encrypted URL blob for flows that
		// were initiated before this change and are still in flight.
		const flowState =
			typeof decoded.token === 'string' ? await this.peekOauthFlowState(decoded.token) : undefined;
		const decryptedState =
			flowState?.stateData ??
			(typeof decoded.data === 'string'
				? jsonParse<CreateCsrfStateData>(await this.cipher.decryptV2(decoded.data), {
						errorMessage,
					})
				: undefined);

		// A parseable token with no recoverable payload means the per-flow entry is
		// gone — the flow was already consumed (replay) or expired out of the cache.
		// Surface that as an invalid callback state rather than a generic format error.
		if (!decryptedState) {
			throw new UnexpectedError('The OAuth callback state is invalid!');
		}

		if (typeof decryptedState.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new UnexpectedError(errorMessage);
		}

		// Browser binding check runs before any origin-specific branch, so that
		// dynamic-credential and N8N_SKIP_AUTH_ON_OAUTH_CALLBACK flows — which
		// otherwise have no user-identity check at callback time — are also
		// protected. A bindingHash is only set when binding was enabled at /auth;
		// states without it pre-date the feature and are accepted.
		if (typeof decryptedState.bindingHash === 'string' && decryptedState.bindingHash.length > 0) {
			const result = this.browserBindingService.verifyBinding(req, decryptedState.bindingHash);
			if (!result.ok) {
				this.eventService.emit('oauth-callback-binding-rejected', {
					reason: result.reason,
					credentialId: decryptedState.cid,
					origin: decryptedState.origin,
				});
				throw new AuthError(
					'This OAuth flow was started in a different browser. Please retry from your original window.',
				);
			}
		}

		// Dynamic credentials: skip user-ownership check since the credential may be shared,
		// but validate userId when both the state and the caller carry an n8n user identity
		// (prevents CSRF-state reuse across users in the browser-initiated OAuth flow).
		// When the flow was initiated externally (e.g. via dynamic-credentials.controller),
		// the state has no userId and the check is skipped.
		if (decryptedState.origin === 'dynamic-credential') {
			if (
				req.user?.id !== undefined &&
				decryptedState.userId !== undefined &&
				decryptedState.userId !== req.user.id
			) {
				throw new AuthError('Unauthorized');
			}
			return [
				{ ...decoded, ...decryptedState },
				await this.getCredentialWithoutUser(decryptedState.cid),
			];
		}

		// Static credentials: skip user validation only when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is true (e.g. embed/iframe)
		if (skipAuthOnOAuthCallback) {
			return [
				{ ...decoded, ...decryptedState },
				await this.getCredentialWithoutUser(decryptedState.cid),
			];
		}

		if (req.user?.id === undefined || decryptedState.userId !== req.user.id) {
			throw new AuthError('Unauthorized');
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			decryptedState.cid,
			req.user,
			['credential:update'],
		);

		return [{ ...decoded, ...decryptedState }, credential];
	}

	protected verifyCsrfState(flowState: OauthFlowState | undefined, state: CsrfState): boolean {
		// Expiry is enforced by the cache TTL (MAX_CSRF_AGE): an expired flow is evicted
		// and surfaces here as `flowState === undefined`. So a missing entry covers both
		// "never existed / already consumed" (replay) and "expired".
		if (!flowState) return false;

		const token = new Csrf();

		return (
			typeof flowState.csrfSecret === 'string' && token.verify(flowState.csrfSecret, state.token)
		);
	}

	async resolveCredential<T>(
		req: OAuthRequest.OAuth1Credential.Callback | OAuthRequest.OAuth2Credential.Callback,
	): Promise<
		[
			CredentialsEntity,
			ICredentialDataDecryptedObject,
			T,
			CsrfState & CreateCsrfStateData,
			OauthFlowState,
		]
	> {
		const { state: encodedState } = req.query;
		const [state, credential] = await this.decodeCsrfState(encodedState, req);
		if (!credential) {
			throw new NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
		}

		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForCallback(
			credential,
			additionalData,
		);

		const oauthCredentials = await this.applyDefaultsAndOverwrites<T>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		const flowState = await this.consumeOauthFlowState(state.token);

		if (!flowState || !this.verifyCsrfState(flowState, state)) {
			throw new UnexpectedError('The OAuth callback state is invalid!');
		}

		return [credential, decryptedDataOriginal, oauthCredentials, state, flowState];
	}

	renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}

	async getOAuthCredentials<T>(credential: CredentialsEntity): Promise<T> {
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);

		// At some point in the past we saved hidden scopes to credentials (but shouldn't)
		// Delete scope before applying defaults to make sure new scopes are present on reconnect
		// Skip the cleanup when the credential exposes scope as user-editable (directly or via
		// inheritance) so that manually entered scopes survive reconnects.
		// For managed credentials we always strip the scope so that the pre-registered default
		// scope on n8n's OAuth app is used, regardless of credential type.
		const userCanEditScope =
			GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE.includes(credential.type) ||
			this.hasEditableScopeProperty(credential.type);

		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			(credential.isManaged || !userCanEditScope)
		) {
			delete decryptedDataOriginal.scope;
		}

		const oauthCredentials = await this.applyDefaultsAndOverwrites<T>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		return oauthCredentials;
	}

	/**
	 * Refresh the OAuth2 token stored on a credential by id, persist the refreshed token data,
	 * and return the new auth headers to inject into outbound requests.
	 */
	async refreshOAuth2CredentialById(
		credentialId: string,
		projectId: string,
	): Promise<Record<string, string> | null> {
		const credential = await this.credentialsRepository.findOne({
			where: { id: credentialId },
			relations: { shared: true },
		});
		if (!credential) return null;

		const isAccessible =
			credential.isGlobal || (credential.shared ?? []).some((s) => s.projectId === projectId);
		if (!isAccessible) return null;

		const oauthCredentials = await this.getOAuthCredentials<OAuth2CredentialData>(credential);
		const oauthTokenData = oauthCredentials.oauthTokenData as ClientOAuth2TokenData | undefined;
		if (!oauthTokenData) return null;

		const scopes = oauthCredentials.scope
			?.split(' ')
			.map((s) => s.trim())
			.filter(Boolean);

		const oAuthClient = new ClientOAuth2({
			clientId: oauthCredentials.clientId,
			clientSecret: oauthCredentials.clientSecret,
			accessTokenUri: oauthCredentials.accessTokenUrl,
			scopes: scopes?.length ? scopes : undefined,
			ignoreSSLIssues: oauthCredentials.ignoreSSLIssues,
			authentication: oauthCredentials.authentication ?? 'header',
		});

		const token = oAuthClient.createToken(
			{
				...oauthTokenData,
				...(oauthTokenData.access_token ? { access_token: oauthTokenData.access_token } : {}),
				...(oauthTokenData.refresh_token ? { refresh_token: oauthTokenData.refresh_token } : {}),
			},
			oauthTokenData.token_type,
		);

		let refreshed;
		try {
			refreshed =
				oauthCredentials.grantType === 'clientCredentials'
					? await token.client.credentials.getToken()
					: await token.refresh();
		} catch (error) {
			this.logger.warn('Failed to refresh OAuth2 token for credential', {
				credentialId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}

		try {
			await this.encryptAndSaveData(credential, { oauthTokenData: refreshed.data });
		} catch (error) {
			this.logger.warn('Refreshed OAuth2 token but failed to persist new token data', {
				credentialId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return { Authorization: `Bearer ${refreshed.accessToken}` };
	}

	/**
	 * Checks whether the credential type (after merging inherited properties) exposes
	 * a user-editable `scope` property. A property is considered editable when it is
	 * defined and its `type` is not `'hidden'`.
	 */
	private hasEditableScopeProperty(credentialType: string): boolean {
		try {
			const properties = this.credentialsHelper.getCredentialsProperties(credentialType);
			const scopeProperty = properties.find((property) => property.name === 'scope');
			return scopeProperty !== undefined && scopeProperty.type !== 'hidden';
		} catch {
			return false;
		}
	}

	private async discoverAndResolveResource(
		oauthCredentials: OAuth2CredentialData,
		csrfData: CreateCsrfStateData,
		authorizationServerUrl: string,
	): Promise<{
		authorizationServerUrl: string;
		discoveredResource: string | undefined;
		discoveredScopes: string[] | undefined;
	}> {
		let discoveredResource: string | undefined;
		let discoveredScopes: string[] | undefined;
		let suppliedResourceUrl: string | undefined;

		if (oauthCredentials.resourceUrl) {
			suppliedResourceUrl = this.validateResourceUrlOrThrow(oauthCredentials.resourceUrl);
		}

		try {
			const protectedResourceMetadata = await this.discoverProtectedResourceMetadata(
				oauthCredentials.serverUrl!,
			);

			if (oauthCredentials.useDynamicClientRegistration) {
				const discoveredAuthorizationServerUrl =
					protectedResourceMetadata.authorization_servers[0]?.trim();
				if (!discoveredAuthorizationServerUrl) {
					throw new InvalidOAuthUrlError('OAuth url is not a valid URL.');
				}
				authorizationServerUrl = discoveredAuthorizationServerUrl;
				this.validateAuthServerUrlOrThrow(authorizationServerUrl);
			}

			discoveredResource = protectedResourceMetadata.resource;
			discoveredScopes = protectedResourceMetadata.scopes_supported;

			this.logger.debug('Protected resource discovery succeeded', {
				resourceUrl: oauthCredentials.serverUrl,
				...(oauthCredentials.useDynamicClientRegistration ? { authorizationServerUrl } : {}),
				discoveredResource,
				discoveredScopes,
			});
		} catch (error) {
			if (error instanceof InvalidOAuthUrlError) {
				throw error;
			}

			this.logger.debug(
				oauthCredentials.useDynamicClientRegistration
					? 'Protected resource discovery failed, assuming serverUrl is authorization server'
					: 'Protected resource discovery failed',
				{
					serverUrl: oauthCredentials.serverUrl,
					error: (error as Error).message,
				},
			);
			if (oauthCredentials.useDynamicClientRegistration) {
				authorizationServerUrl = oauthCredentials.serverUrl!;
			}
		}

		const resolvedResource = this.resolveResourceUrl(
			suppliedResourceUrl,
			discoveredResource,
			oauthCredentials.serverUrl!,
		);

		if (resolvedResource) {
			oauthCredentials.resource = resolvedResource;
			csrfData.resource = resolvedResource;
		}

		return { authorizationServerUrl, discoveredResource, discoveredScopes };
	}
	/**
	 * Mutates `csrfData` to include a `bindingHash` when browser binding is
	 * enabled and a request/response pair is available. No-op otherwise — so
	 * server-initiated flows (e.g. workflow-execution credential checks) that
	 * don't carry a browser context naturally skip binding.
	 */
	private applyBrowserBindingIfEnabled(
		csrfData: CreateCsrfStateData,
		req?: Request,
		res?: Response,
	): void {
		if (!req || !res) return;
		if (!this.browserBindingService.isEnabled()) return;
		const nonce = this.browserBindingService.ensureBindingCookie(req, res);
		csrfData.bindingHash = this.browserBindingService.computeHash(nonce);
	}

	async generateAOauth2AuthUri(
		credential: CredentialsEntity,
		csrfData: CreateCsrfStateData,
		req?: Request,
		res?: Response,
	): Promise<string> {
		this.applyBrowserBindingIfEnabled(csrfData, req, res);

		const oauthCredentials: OAuth2CredentialData =
			await this.getOAuthCredentials<OAuth2CredentialData>(credential);

		const toUpdate: ICredentialDataDecryptedObject = {};

		let authorizationServerUrl = oauthCredentials.serverUrl;
		let discoveredScopes: string[] | undefined;

		if (oauthCredentials.serverUrl) {
			// Validate serverUrl to prevent SSRF attacks before any HTTP requests
			this.validateOAuthUrlOrThrow(oauthCredentials.serverUrl);

			const { authorizationServerUrl: resolvedAuthUrl, discoveredScopes: resolvedScopes } =
				await this.discoverAndResolveResource(oauthCredentials, csrfData, authorizationServerUrl!);
			authorizationServerUrl = resolvedAuthUrl;
			discoveredScopes = resolvedScopes;
		} else if (oauthCredentials.resourceUrl) {
			// Static credential with no serverUrl – validate resource URL and wire it through
			const resolvedResource = this.validateResourceUrlOrThrow(oauthCredentials.resourceUrl);
			oauthCredentials.resource = resolvedResource;
			csrfData.resource = resolvedResource;
		}

		if (oauthCredentials.useDynamicClientRegistration && oauthCredentials.serverUrl) {
			await this.performDynamicClientRegistration(
				oauthCredentials,
				authorizationServerUrl!,
				toUpdate,
				discoveredScopes,
			);
		}

		this.validateOAuthUrlOrThrow(oauthCredentials.authUrl ?? '');
		this.validateOAuthUrlOrThrow(oauthCredentials.accessTokenUrl ?? '');

		// Generate a CSRF prevention token and send it as an OAuth2 state string
		const [csrfSecret, state, stateToken] = await this.createCsrfState();

		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};

		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}

		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		const flowState: OauthFlowState = { csrfSecret, stateData: csrfData };
		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = await pkceChallenge();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			flowState.codeVerifier = code_verifier;
		}

		await this.storeOauthFlowState(stateToken, flowState);

		// Only persist DCR-driven updates to the credential. CSRF/PKCE state lives in the cache
		// to avoid cross-user races on shared credentials.
		if (Object.keys(toUpdate).length > 0) {
			await this.encryptAndSaveData(credential, toUpdate);
		}

		const oAuthObj = new ClientOAuth2(oAuthOptions);
		const returnUri = oAuthObj.code.getUri();

		this.logger.debug('OAuth2 authorization url created for credential', {
			csrfData,
			credentialId: credential.id,
		});

		return returnUri.toString();
	}

	private async performDynamicClientRegistration(
		oauthCredentials: OAuth2CredentialData,
		authorizationServerUrl: string,
		toUpdate: ICredentialDataDecryptedObject,
		discoveredResourceScopes?: string[],
	): Promise<void> {
		// Step 2: Discover Authorization Server Metadata (RFC 8414 / OpenID Connect)
		const dcrAuthorizationServerUrl = authorizationServerUrl ?? oauthCredentials.serverUrl;
		const issuerUrl = new URL(dcrAuthorizationServerUrl);
		const pathComponent = issuerUrl.pathname.replace(/\/$/, ''); // Remove trailing slash

		// Build discovery URLs in priority order per MCP specification
		// If the path already contains /.well-known/, skip path-insertion variants to avoid
		// double well-known paths (e.g. /.well-known/openid-configuration/.well-known/openid-configuration)
		const pathIsWellKnown = pathComponent.startsWith('/.well-known');
		const discoveryUrls =
			pathComponent && !pathIsWellKnown
				? [
						// 1. RFC 8414: OAuth 2.0 Authorization Server Metadata (path insertion)
						`${issuerUrl.origin}/.well-known/oauth-authorization-server${pathComponent}`,
						// 2. OpenID Connect Discovery 1.0 (path insertion)
						`${issuerUrl.origin}/.well-known/openid-configuration${pathComponent}`,
						// 3. OpenID Connect Discovery 1.0 (path appending)
						`${dcrAuthorizationServerUrl}/.well-known/openid-configuration`,
						// 4. RFC 8414 origin-only fallback (matches MCP TypeScript SDK behavior)
						`${issuerUrl.origin}/.well-known/oauth-authorization-server`,
					]
				: [
						// For root-level issuers or already-well-known paths
						`${issuerUrl.origin}/.well-known/oauth-authorization-server`,
						`${issuerUrl.origin}/.well-known/openid-configuration`,
					];

		let data: unknown;
		let lastError: Error | undefined;

		// Try each discovery URL until one succeeds
		for (const url of discoveryUrls) {
			try {
				// Validate each URL before making request (defense-in-depth)
				this.validateOAuthUrlOrThrow(url);

				data = await this.fetchDiscoveryDocument(url);
				break; // Success - exit loop
			} catch (error) {
				lastError = error as Error;
				// Continue to next URL
			}
		}

		if (!data) {
			throw new BadRequestError(
				`Failed to discover OAuth2 authorization server metadata. Tried: ${discoveryUrls.join(', ')}. Last error: ${lastError?.message}`,
			);
		}

		// Validate the metadata response
		const metadataValidation = oAuthAuthorizationServerMetadataSchema.safeParse(data);
		if (!metadataValidation.success) {
			throw new BadRequestError(
				`Invalid OAuth2 server metadata: ${metadataValidation.error.issues.map((e) => e.message).join(', ')}`,
			);
		}

		const { authorization_endpoint, token_endpoint, registration_endpoint, scopes_supported } =
			metadataValidation.data;
		oauthCredentials.authUrl = authorization_endpoint;
		oauthCredentials.accessTokenUrl = token_endpoint;
		toUpdate.authUrl = authorization_endpoint;
		toUpdate.accessTokenUrl = token_endpoint;
		// Prefer the scopes advertised by the protected resource (RFC 9728) over the
		// authorization server's scopes_supported (RFC 8414). Some servers only
		// advertise the required scopes on the protected resource document.
		const effectiveScopes = discoveredResourceScopes?.length
			? discoveredResourceScopes
			: scopes_supported;
		const scope = effectiveScopes?.length ? effectiveScopes.join(' ') : undefined;
		if (scope) {
			oauthCredentials.scope = scope;
			toUpdate.scope = scope;
		}

		const { grantType, authentication } = this.selectGrantTypeAndAuthenticationMethod(
			metadataValidation.data.grant_types_supported ?? ['authorization_code', 'implicit'],
			metadataValidation.data.token_endpoint_auth_methods_supported ?? [],
			metadataValidation.data.code_challenge_methods_supported ?? [],
		);
		oauthCredentials.grantType = grantType;
		toUpdate.grantType = grantType;
		if (authentication) {
			oauthCredentials.authentication = authentication;
			toUpdate.authentication = authentication;
		}

		const { grant_types, token_endpoint_auth_method } = this.mapGrantTypeAndAuthenticationMethod(
			grantType,
			authentication,
		);
		const registerPayload = {
			redirect_uris: [`${this.getBaseUrl(OauthVersion.V2)}/callback`],
			token_endpoint_auth_method,
			grant_types,
			response_types: ['code'],
			client_name: 'n8n',
			client_uri: 'https://n8n.io/',
			scope,
			...(oauthCredentials.jweEnabled === true
				? await this.oauthJweServiceProxy.getDcrJweFields(oauthCredentials.inlineJwks === true)
				: {}),
		};

		await this.externalHooks.run('oauth2.dynamicClientRegistration', [registerPayload]);

		const registerResult = await this.http.request({
			url: registration_endpoint,
			method: 'POST',
			body: registerPayload,
			json: true,
			timeout: OAUTH_REQUEST_TIMEOUT_MS,
		});
		const registrationValidation =
			dynamicClientRegistrationResponseSchema.safeParse(registerResult);
		if (!registrationValidation.success) {
			throw new BadRequestError(
				`Invalid client registration response: ${registrationValidation.error.issues.map((e) => e.message).join(', ')}`,
			);
		}

		const { client_id, client_secret } = registrationValidation.data;
		oauthCredentials.clientId = client_id;
		toUpdate.clientId = client_id;
		if (client_secret) {
			oauthCredentials.clientSecret = client_secret;
			toUpdate.clientSecret = client_secret;
		}
	}

	async generateAOauth1AuthUri(
		credential: CredentialsEntity,
		csrfData: CreateCsrfStateData,
		req?: Request,
		res?: Response,
	): Promise<string> {
		this.applyBrowserBindingIfEnabled(csrfData, req, res);

		const oauthCredentials: OAuth1CredentialData =
			await this.getOAuthCredentials<OAuth1CredentialData>(credential);

		this.validateOAuthUrlOrThrow(oauthCredentials.authUrl ?? '');
		this.validateOAuthUrlOrThrow(oauthCredentials.requestTokenUrl ?? '');
		this.validateOAuthUrlOrThrow(oauthCredentials.accessTokenUrl ?? '');

		const [csrfSecret, state, stateToken] = await this.createCsrfState();

		const signatureMethod = oauthCredentials.signatureMethod;

		const oAuthOptions: clientOAuth1.Options = {
			consumer: {
				key: oauthCredentials.consumerKey,
				secret: oauthCredentials.consumerSecret,
			},
			signature_method: signatureMethod,

			hash_function(base, key) {
				const algorithm = algorithmMap[signatureMethod] ?? 'sha1';
				return createHmac(algorithm, key).update(base).digest('base64');
			},
		};

		const oauthRequestData = {
			oauth_callback: `${this.getBaseUrl(OauthVersion.V1)}/callback?state=${state}`,
		};

		await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);

		const oauth = new clientOAuth1(oAuthOptions);

		const options: RequestOptions = {
			method: 'POST',
			url: oauthCredentials.requestTokenUrl,
			data: oauthRequestData,
		};

		const data = oauth.toHeader(oauth.authorize(options));

		const response = await this.http.request({
			url: options.url,
			method: 'POST',
			headers: { ...data },
			encoding: 'text',
			timeout: OAUTH_REQUEST_TIMEOUT_MS,
		});

		// Response comes as x-www-form-urlencoded string so convert it to JSON
		if (typeof response !== 'string') {
			throw new BadRequestError(
				'Expected string response from OAuth1 request token endpoint, but received invalid response type',
			);
		}

		const paramsParser = new URLSearchParams(response);
		const responseJson = Object.fromEntries(paramsParser.entries());

		if (!responseJson.oauth_token) {
			throw new BadRequestError(
				'OAuth1 request token response is missing required oauth_token parameter',
			);
		}

		const returnUriUrl = new URL(oauthCredentials.authUrl);
		returnUriUrl.searchParams.set('oauth_token', responseJson.oauth_token);
		const returnUri = returnUriUrl.toString();

		// The request-token secret is required to sign the later access-token request, so it
		// must outlive this call. It lives in the cache (not on the shared credential) so
		// concurrent flows by different users don't clobber each other's secret.
		await this.storeOauthFlowState(stateToken, {
			csrfSecret,
			stateData: csrfData,
			oauthTokenSecret: responseJson.oauth_token_secret ?? '',
		});

		this.logger.debug('OAuth1 authorization url created for credential', {
			csrfData,
			credentialId: credential.id,
		});

		return returnUri;
	}

	/**
	 * Exchanges an authorized OAuth1 request token for an access token.
	 *
	 * The access token request must be signed with the consumer credentials and
	 * the request token key/secret obtained during {@link generateAOauth1AuthUri}.
	 * Returns the parsed token data from the (x-www-form-urlencoded) response.
	 */
	async getOAuth1AccessToken(
		oauthCredentials: OAuth1CredentialData,
		params: { oauthToken: string; oauthVerifier: string; oauthTokenSecret: string },
	): Promise<Record<string, string>> {
		const { signatureMethod } = oauthCredentials;

		const oauth = new clientOAuth1({
			consumer: {
				key: oauthCredentials.consumerKey,
				secret: oauthCredentials.consumerSecret,
			},
			signature_method: signatureMethod,
			hash_function(base, key) {
				const algorithm = algorithmMap[signatureMethod] ?? 'sha1';
				return createHmac(algorithm, key).update(base).digest('base64');
			},
		});

		const requestData: RequestOptions = {
			method: 'POST',
			url: oauthCredentials.accessTokenUrl,
			data: { oauth_verifier: params.oauthVerifier },
		};

		const token = { key: params.oauthToken, secret: params.oauthTokenSecret };
		const headers = oauth.toHeader(oauth.authorize(requestData, token));

		// `oauth_verifier` is part of the signature base string but is not emitted
		// into the Authorization header by `toHeader`, so it must travel in the
		// form-encoded body for the server to receive and verify it.
		const response = await this.http.request({
			url: oauthCredentials.accessTokenUrl,
			method: 'POST',
			body: new URLSearchParams({ oauth_verifier: params.oauthVerifier }).toString(),
			headers: {
				...headers,
				'content-type': 'application/x-www-form-urlencoded',
			},
			encoding: 'text',
			timeout: OAUTH_REQUEST_TIMEOUT_MS,
		});

		// Response comes as x-www-form-urlencoded string so convert it to JSON
		if (typeof response !== 'string') {
			throw new BadRequestError(
				'Expected string response from OAuth1 access token endpoint, but received invalid response type',
			);
		}

		return Object.fromEntries(new URLSearchParams(response).entries());
	}

	private convertCredentialToOptions(credential: OAuth2CredentialData): ClientOAuth2Options {
		const options: ClientOAuth2Options = {
			clientId: credential.clientId,
			clientSecret: credential.clientSecret ?? '',
			accessTokenUri: credential.accessTokenUrl ?? '',
			authorizationUri: credential.authUrl ?? '',
			authentication: credential.authentication ?? 'header',
			redirectUri: `${this.getBaseUrl(OauthVersion.V2)}/callback`,
			scopes: split(credential.scope ?? 'openid', ','),
			scopesSeparator: credential.scope?.includes(',') ? ',' : ' ',
			resource: credential.resource,
			ignoreSSLIssues: credential.ignoreSSLIssues ?? false,
		};

		if (
			credential.additionalBodyProperties &&
			typeof credential.additionalBodyProperties === 'string'
		) {
			const parsedBody = jsonParse<Record<string, string>>(credential.additionalBodyProperties);

			if (parsedBody) {
				options.body = parsedBody;
			}
		}

		return options;
	}

	/**
	 * Fetches a `.well-known` discovery document and returns its parsed JSON body.
	 * Only a 200 is accepted (RFC 8414 / RFC 9728 / OpenID Connect discovery endpoints respond with 200).
	 * Any other status, or a transport/SSRF failure, throws,
	 * so the discovery loops can uniformly catch and fall through to the next candidate URL.
	 */
	private async fetchDiscoveryDocument(url: string): Promise<unknown> {
		const response = await this.http.request({
			url,
			method: 'GET',
			json: true,
			returnFullResponse: true,
			timeout: OAUTH_REQUEST_TIMEOUT_MS,
		});
		if (response.statusCode !== 200) {
			throw new OperationalError(`Request failed with status code ${response.statusCode}`);
		}
		return response.body;
	}

	/**
	 * Discovers OAuth 2.0 Protected Resource Metadata per RFC 9728.
	 * This is the first step in MCP-compliant OAuth discovery.
	 * Returns the authorization_servers array from the metadata.
	 */
	private async discoverProtectedResourceMetadata(
		resourceUrl: string,
	): Promise<{ authorization_servers: string[]; resource?: string; scopes_supported?: string[] }> {
		// Validate input to prevent SSRF (defense-in-depth)
		this.validateOAuthUrlOrThrow(resourceUrl);

		const url = new URL(resourceUrl);
		const pathComponent = url.pathname.replace(/\/$/, ''); // Remove trailing slash

		// Try discovery URLs per MCP spec and RFC 9728
		const discoveryUrls = pathComponent
			? [
					// Path-specific first (e.g., https://mcp.notion.com/.well-known/oauth-protected-resource/mcp)
					`${url.origin}/.well-known/oauth-protected-resource${pathComponent}`,
					// Root fallback (e.g., https://mcp.notion.com/.well-known/oauth-protected-resource)
					`${url.origin}/.well-known/oauth-protected-resource`,
				]
			: [
					// Root only for root-level URLs
					`${url.origin}/.well-known/oauth-protected-resource`,
				];

		for (const discoveryUrl of discoveryUrls) {
			try {
				// Validate each URL before making request (defense-in-depth)
				this.validateOAuthUrlOrThrow(discoveryUrl);

				const data = await this.fetchDiscoveryDocument(discoveryUrl);

				// Validate has authorization_servers field per RFC 9728
				if (data && typeof data === 'object') {
					const record = data as Record<string, unknown>;
					const authorizationServers = record.authorization_servers;
					if (Array.isArray(authorizationServers) && authorizationServers.length > 0) {
						const rawResource = record.resource;
						const resource =
							typeof rawResource === 'string'
								? this.validateResourceUrlOrThrow(rawResource)
								: undefined;
						// Per RFC 9728 the protected resource advertises the scopes required to
						// access it. Some authorization servers (e.g. Atlassian) omit
						// scopes_supported from their RFC 8414 metadata, so these are the only
						// scopes available for the request.
						const rawScopes = record.scopes_supported;
						const scopes_supported = Array.isArray(rawScopes)
							? rawScopes.filter((s): s is string => typeof s === 'string')
							: undefined;
						return {
							authorization_servers: authorizationServers,
							...(resource ? { resource } : {}),
							...(scopes_supported?.length ? { scopes_supported } : {}),
						};
					}
				}
			} catch (error) {
				// Continue to next URL
			}
		}

		throw new BadRequestError(
			`Failed to discover protected resource metadata. Tried: ${discoveryUrls.join(', ')}`,
		);
	}

	private selectGrantTypeAndAuthenticationMethod(
		grantTypes: string[],
		tokenEndpointAuthMethods: string[],
		codeChallengeMethods: string[],
	): { grantType: OAuth2GrantType; authentication?: OAuth2AuthenticationMethod } {
		const supportsPkce = codeChallengeMethods.includes('S256');

		if (grantTypes.includes('authorization_code')) {
			// Public-client PKCE only when the server allows the 'none' auth method, or
			// advertises no auth methods at all (servers that expose only PKCE metadata).
			if (
				supportsPkce &&
				(tokenEndpointAuthMethods.length === 0 || tokenEndpointAuthMethods.includes('none'))
			) {
				return { grantType: 'pkce' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'authorizationCode', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'authorizationCode', authentication: 'body' };
			}

			// S256 advertised alongside only unrecognized methods: fall back to public-client PKCE.
			if (supportsPkce) {
				return { grantType: 'pkce' };
			}

			// Server omitted token_endpoint_auth_methods_supported: default to client_secret_basic (RFC 8414).
			if (tokenEndpointAuthMethods.length === 0) {
				return { grantType: 'authorizationCode', authentication: 'header' };
			}
		}

		if (grantTypes.includes('client_credentials')) {
			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'clientCredentials', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'clientCredentials', authentication: 'body' };
			}

			// Server omitted token_endpoint_auth_methods_supported: default to client_secret_basic (RFC 8414).
			if (tokenEndpointAuthMethods.length === 0) {
				return { grantType: 'clientCredentials', authentication: 'header' };
			}
		}

		throw new BadRequestError('No supported grant type and authentication method found');
	}

	private mapGrantTypeAndAuthenticationMethod(
		grantType: OAuth2GrantType,
		authentication?: OAuth2AuthenticationMethod,
	) {
		if (grantType === 'pkce') {
			return {
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
			};
		}

		const tokenEndpointAuthMethod =
			authentication === 'header' ? 'client_secret_basic' : 'client_secret_post';
		if (grantType === 'authorizationCode') {
			return {
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: tokenEndpointAuthMethod,
			};
		}

		return {
			grant_types: ['client_credentials'],
			token_endpoint_auth_method: tokenEndpointAuthMethod,
		};
	}

	async saveDynamicCredential(
		credential: CredentialsEntity,
		oauthTokenData: ICredentialDataDecryptedObject,
		authHeader: string,
		credentialResolverId: string,
		authMetadata: Record<string, unknown> = {},
	) {
		const credentials = new Credentials(credential, credential.type, credential.data);
		await credentials.updateData(oauthTokenData);

		const credentialStoreMetadata: CredentialStoreMetadata = {
			id: credential.id,
			name: credential.name,
			type: credential.type,
			isResolvable: credential.isResolvable,
			resolverId: credentialResolverId,
		};

		await this.dynamicCredentialsProxy.storeIfNeeded(
			credentialStoreMetadata,
			oauthTokenData,
			{ version: 1, identity: authHeader, metadata: authMetadata },
			await credentials.getData(),
			{ credentialResolverId },
		);
	}
}
