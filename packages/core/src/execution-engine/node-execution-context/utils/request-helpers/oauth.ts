/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { LockNamespace, LockAcquisitionTimeoutError, LockService } from '@n8n/backend-common';
import { removeEmptyBody } from '@n8n/backend-network';
import type {
	ClientOAuth2Options,
	ClientOAuth2RequestObject,
	ClientOAuth2Token,
	ClientOAuth2TokenData,
	OAuth2CredentialData,
} from '@n8n/client-oauth2';
import { AuthError, ClientOAuth2 } from '@n8n/client-oauth2';
import { Container } from '@n8n/di';
import type { AxiosError } from 'axios';
import { createHmac } from 'crypto';
import get from 'lodash/get';
import type {
	IAllExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
	INode,
	IOAuth2Options,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	Logger as WorkflowLogger,
} from 'n8n-workflow';
import {
	OperationalError,
	jsonParse,
	NodeOperationError,
	UserError,
	UnexpectedError,
} from 'n8n-workflow';
import type { Token } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';

import type { IResponseError } from '@/interfaces';

function createOAuth2Client(credentials: OAuth2CredentialData): ClientOAuth2 {
	// Split and trim scopes; empty scope tokens are not RFC 6749-compliant and may be rejected by authorization servers
	const scopes = credentials.scope
		?.split(' ')
		.map((s) => s.trim())
		.filter(Boolean);
	return new ClientOAuth2({
		clientId: credentials.clientId,
		clientSecret: credentials.clientSecret,
		accessTokenUri: credentials.accessTokenUrl,
		scopes: scopes?.length ? scopes : undefined,
		ignoreSSLIssues: credentials.ignoreSSLIssues,
		authentication: credentials.authentication ?? 'header',
		...(credentials.additionalBodyProperties && {
			additionalBodyProperties: jsonParse(credentials.additionalBodyProperties, {
				fallbackValue: {},
			}),
		}),
	});
}

function buildSigningToken(
	client: ClientOAuth2,
	tokenData: ClientOAuth2TokenData,
	oAuth2Options?: IOAuth2Options,
): ClientOAuth2Token {
	const accessToken = get(tokenData, oAuth2Options?.property as string) || tokenData.accessToken;
	const refreshToken = tokenData.refreshToken;
	return client.createToken(
		{
			...tokenData,
			...(accessToken ? { access_token: accessToken } : {}),
			...(refreshToken ? { refresh_token: refreshToken } : {}),
		},
		oAuth2Options?.tokenType || tokenData.tokenType,
	);
}

interface RefreshOAuth2TokenContext {
	credentials: OAuth2CredentialData;
	token: ClientOAuth2Token;
	credentialsType: string;
	node: INode;
	additionalData: IWorkflowExecuteAdditionalData;
	oAuth2Options?: IOAuth2Options;
	logger: WorkflowLogger;
	mode: WorkflowExecuteMode;
	helpers: IAllExecuteFunctions['helpers'];
}

async function decryptOAuth2TokenDataIfConfigured<T extends IDataObject | undefined>(
	additionalData: IWorkflowExecuteAdditionalData,
	tokenData: T,
	jweEnabled: boolean,
): Promise<T | IDataObject> {
	if (!jweEnabled) return tokenData;
	const proxy = additionalData['oauth-jwe']?.oauthJweProxyProvider;
	if (!proxy || !tokenData) return tokenData;
	return await proxy.decryptOAuth2TokenData(tokenData);
}

function isRevokedOAuth2GrantError(error: unknown): boolean {
	if (!(error instanceof AuthError)) return false;
	const body = error.body as { error?: unknown } | undefined;
	return body?.error === 'invalid_grant';
}

function buildOAuth2ReconnectError(node: INode, credentialsType: string): NodeOperationError {
	const credentialName = node.credentials?.[credentialsType]?.name;
	const credentialLabel = credentialName ? `"${credentialName}"` : `of type "${credentialsType}"`;
	return new NodeOperationError(
		node,
		`The credential ${credentialLabel} needs to be reconnected.`,
		{
			description:
				'Access could not be refreshed because the connected account has revoked access, the refresh token expired, or the account password or permissions changed. Open the credential and reconnect it to continue.',
			level: 'warning',
		},
	);
}

const inFlightRefreshes = new Map<string, Promise<ClientOAuth2Token>>();

async function refreshOrFetchToken(ctx: RefreshOAuth2TokenContext): Promise<ClientOAuth2Token> {
	const nodeCredentials = ctx.node.credentials?.[ctx.credentialsType];
	const credentialId = nodeCredentials?.id;

	if (!credentialId) {
		throw new UnexpectedError('Found credential with no ID.', {
			extra: { credentialName: nodeCredentials?.name },
			tags: { credentialType: ctx.credentialsType },
		});
	}

	// Critical section from here until the in-flight promise is stored in the map.
	// This map is process-LOCAL: it coalesces concurrent refreshes *within this instance*
	// so they share one network call. Cross-instance serialization is handled by the lease below.
	// We must not yield to the event loop before `inFlightRefreshes.set(...)`, or a second concurrent
	// caller could pass the `has` check before the promise is registered and trigger a duplicate refresh.
	if (inFlightRefreshes.has(credentialId)) {
		return await inFlightRefreshes.get(credentialId)!;
	}

	const runRefresh = async () => {
		const {
			credentials,
			token,
			credentialsType,
			node,
			additionalData,
			oAuth2Options,
			logger,
			helpers,
		} = ctx;
		const currentCredential = (await additionalData.credentialsHelper.getDecrypted(
			additionalData,
			nodeCredentials,
			ctx.credentialsType,
			ctx.mode,
			undefined,
			true,
		)) as unknown as OAuth2CredentialData;

		// Resolve the stored token through the same property path used to build `token`,
		// otherwise the comparison misfires for nodes using `oAuth2Options.property` (e.g. Slack),
		// where `token.accessToken` is a nested value rather than the top-level `access_token`.
		const currentAccessToken =
			get(currentCredential?.oauthTokenData, oAuth2Options?.property as string) ||
			currentCredential?.oauthTokenData?.access_token;

		// if the access token value changed, the refresh already happend in another process, so we can just return the new token
		if (currentAccessToken !== token.accessToken) {
			return buildSigningToken(
				token.client,
				currentCredential?.oauthTokenData as ClientOAuth2TokenData,
				oAuth2Options,
			);
		}

		const tokenRefreshOptions: IDataObject = {};
		if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
			const body: IDataObject = {
				client_id: credentials.clientId,
				...(credentials.grantType === 'authorizationCode' && {
					client_secret: credentials.clientSecret as string,
				}),
			};
			tokenRefreshOptions.body = body;
			tokenRefreshOptions.headers = { Authorization: '' };
		}

		logger.debug(
			`OAuth2 token for "${credentialsType}" used by node "${node.name}" expired. Revalidating.`,
		);

		const refreshResource = credentials.oauthTokenData?.resource;
		if (typeof refreshResource === 'string' && refreshResource.length > 0) {
			tokenRefreshOptions.resource = refreshResource;
		}

		let newToken;
		try {
			if (credentials.grantType === 'clientCredentials') {
				newToken = await token.client.credentials.getToken();
			} else {
				newToken = await token.refresh(tokenRefreshOptions as unknown as ClientOAuth2Options);
			}
		} catch (error) {
			if (isRevokedOAuth2GrantError(error)) {
				throw buildOAuth2ReconnectError(node, credentialsType);
			}
			throw error;
		}

		logger.debug(
			`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
		);

		// Merge old and new token data so fields that the authorization server
		// does not echo back on refresh (e.g. `resource`) are preserved from the
		// original token response.
		const newOAuthTokenData = { ...token.data, ...newToken.data };

		// If the server doesn't echo the resource back, restore it from the
		// previous token data to ensure it's not lost on refresh.
		if (!newOAuthTokenData.resource && token.data.resource) {
			newOAuthTokenData.resource = token.data.resource;
		}

		const refreshedTokenData = await decryptOAuth2TokenDataIfConfigured(
			additionalData,
			newOAuthTokenData,
			credentials.jweEnabled === true,
		);

		credentials.oauthTokenData = refreshedTokenData as typeof credentials.oauthTokenData;

		// Apply preAuthentication so custom credential types extending oAuth2Api can transform
		// refreshed token data (e.g. extracting a claim from a decrypted JWE/JWT) before signing.
		// runPreAuthentication runs on every refresh without persisting — the transformed
		// oauthTokenData is persisted by the updateCredentialsOauthTokenData call below.
		const preAuthData = await additionalData.credentialsHelper.runPreAuthentication(
			{ helpers },
			credentials as unknown as ICredentialDataDecryptedObject,
			credentialsType,
		);
		let signingToken = newToken;
		if (preAuthData) {
			Object.assign(credentials, preAuthData);
			signingToken = buildSigningToken(
				token.client,
				credentials.oauthTokenData as ClientOAuth2TokenData,
				oAuth2Options,
			);
		}

		if (!node.credentials?.[credentialsType]) {
			throw new UserError('Node does not have credential type', {
				extra: { nodeName: node.name, credentialType: credentialsType },
			});
		}

		await additionalData.credentialsHelper.updateCredentialsOauthTokenData(
			nodeCredentials,
			credentialsType,
			credentials as unknown as ICredentialDataDecryptedObject,
			additionalData,
		);

		return signingToken;
	};

	const promise = Container.get(LockService)
		.withLease(LockNamespace.CREDENTIALS, credentialId, runRefresh, {
			waitTimeoutMs: 10_000,
			leaseTtlMs: 30_000,
		})
		.catch(async (error) => {
			if (error instanceof LockAcquisitionTimeoutError) {
				// The lease is an efficiency primitive, not a correctness one. If the lock
				// backend is unavailable/contended, refresh without cross-process coordination
				// rather than stalling the execution; runRefresh's read-back check still avoids
				// a redundant network call when another holder already rotated the token.
				ctx.logger.warn(
					`Could not acquire refresh lock for credential "${credentialId}"; refreshing without cross-process coordination`,
					{ error },
				);
				return await runRefresh();
			}
			throw error;
		})
		.finally(() => inFlightRefreshes.delete(credentialId));
	inFlightRefreshes.set(credentialId, promise);

	return await promise;
}

function resolveTokenExpiredStatusCode(
	oAuth2Options?: IOAuth2Options,
	credentials?: OAuth2CredentialData,
): number {
	return credentials?.tokenExpiredStatusCode ?? oAuth2Options?.tokenExpiredStatusCode ?? 401;
}

/** @deprecated make these requests using httpRequestWithAuthentication */
export async function requestOAuth2(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
	isN8nRequest = false,
) {
	removeEmptyBody(requestOptions);

	const credentials = (await this.getCredentials(
		credentialsType,
	)) as unknown as OAuth2CredentialData;

	// Only the OAuth2 with authorization code grant needs connection
	if (credentials.grantType === 'authorizationCode' && credentials.oauthTokenData === undefined) {
		throw new UserError('OAuth credentials not connected');
	}

	const oAuthClient = createOAuth2Client(credentials);

	let oauthTokenData = credentials.oauthTokenData as ClientOAuth2TokenData;
	// if it's the first time using the credentials, get the access token and save it into the DB.
	if (
		credentials.grantType === 'clientCredentials' &&
		(oauthTokenData === undefined ||
			Object.keys(oauthTokenData).length === 0 ||
			oauthTokenData.access_token === '') // stub
	) {
		let tokenResult: Awaited<ReturnType<typeof oAuthClient.credentials.getToken>>;
		try {
			tokenResult = await oAuthClient.credentials.getToken();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new OperationalError(`Failed to acquire OAuth2 access token: ${message}`, {
				cause: error,
			});
		}
		const { data } = tokenResult;
		// Find the credentials
		if (!node.credentials?.[credentialsType]) {
			throw new UserError('Node does not have credential type', {
				extra: { nodeName: node.name },
				tags: { credentialType: credentialsType },
			});
		}

		const nodeCredentials = node.credentials[credentialsType];
		const initialTokenData = (await decryptOAuth2TokenDataIfConfigured(
			additionalData,
			data,
			credentials.jweEnabled === true,
		)) as ClientOAuth2TokenData;
		credentials.oauthTokenData = initialTokenData;

		// Save the refreshed token
		await additionalData.credentialsHelper.updateCredentialsOauthTokenData(
			nodeCredentials,
			credentialsType,
			credentials as unknown as ICredentialDataDecryptedObject,
			additionalData,
		);

		oauthTokenData = initialTokenData;
	}

	// Apply preAuthentication for custom OAuth2 credential types extending oAuth2Api.
	// Enables transforming token data on every request (e.g. extracting a claim from a
	// decrypted JWE/JWT) as a pure in-memory transform — no DB write per request.
	const preAuthData = await additionalData.credentialsHelper.runPreAuthentication(
		{ helpers: this.helpers },
		credentials as unknown as ICredentialDataDecryptedObject,
		credentialsType,
	);
	if (preAuthData) {
		Object.assign(credentials, preAuthData);
		oauthTokenData = credentials.oauthTokenData as ClientOAuth2TokenData;
	}

	const token = buildSigningToken(oAuthClient, oauthTokenData, oAuth2Options);

	(requestOptions as IRequestOptions).rejectUnauthorized = !credentials.ignoreSSLIssues;

	// Signs the request by adding authorization headers or query parameters depending
	// on the token-type used.
	const newRequestOptions = token.sign(requestOptions as ClientOAuth2RequestObject);
	const newRequestHeaders = (newRequestOptions.headers = newRequestOptions.headers ?? {});
	// If keep bearer is false remove the it from the authorization header
	if (oAuth2Options?.keepBearer === false && typeof newRequestHeaders.Authorization === 'string') {
		newRequestHeaders.Authorization = newRequestHeaders.Authorization.split(' ')[1];
	}
	if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
		Object.assign(newRequestHeaders, {
			[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
		});
	}
	const tokenExpiredStatusCode = resolveTokenExpiredStatusCode(oAuth2Options, credentials);
	const shouldSkipTokenRefresh = oAuth2Options?.skipTokenRefresh === true;

	const refreshCtx: RefreshOAuth2TokenContext = {
		credentials,
		token,
		credentialsType,
		node,
		additionalData,
		oAuth2Options,
		logger: this.logger,
		helpers: this.helpers,
		mode: this.getMode?.() ?? 'internal',
	};

	const retryWithNewToken = async (
		makeRequest: (opts: ClientOAuth2RequestObject) => Promise<any>,
	) => {
		const newToken = await refreshOrFetchToken(refreshCtx);
		const refreshedRequestOptions = newToken.sign(requestOptions as ClientOAuth2RequestObject);
		refreshedRequestOptions.headers = refreshedRequestOptions.headers ?? {};
		if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
			Object.assign(refreshedRequestOptions.headers, {
				[oAuth2Options.keyToIncludeInAccessTokenHeader]: newToken.accessToken,
			});
		}
		return await makeRequest(refreshedRequestOptions);
	};

	if (isN8nRequest) {
		return await this.helpers.httpRequest(newRequestOptions).catch(async (error: AxiosError) => {
			if (!shouldSkipTokenRefresh && error.response?.status === tokenExpiredStatusCode) {
				return await retryWithNewToken(async (opts) => await this.helpers.httpRequest(opts));
			}
			throw error;
		});
	}

	return await this.helpers
		.request(newRequestOptions as IRequestOptions)
		.then((response) => {
			const requestOptions = newRequestOptions as any;
			if (
				!shouldSkipTokenRefresh &&
				requestOptions.resolveWithFullResponse === true &&
				requestOptions.simple === false &&
				response.statusCode === tokenExpiredStatusCode
			) {
				throw response;
			}
			return response;
		})
		.catch(async (error: IResponseError) => {
			if (!shouldSkipTokenRefresh && error.statusCode === tokenExpiredStatusCode) {
				return await retryWithNewToken(
					async (opts) => await this.helpers.request(opts as IRequestOptions),
				);
			}
			throw error;
		});
}

/** @deprecated make these requests using httpRequestWithAuthentication */
export async function requestOAuth1(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	isN8nRequest = false,
) {
	removeEmptyBody(requestOptions);

	const credentials = await this.getCredentials(credentialsType);

	if (credentials === undefined) {
		throw new UserError('No credentials were returned');
	}

	if (credentials.oauthTokenData === undefined) {
		throw new UserError('OAuth credentials not connected');
	}

	const oauth = new clientOAuth1({
		consumer: {
			key: credentials.consumerKey as string,
			secret: credentials.consumerSecret as string,
		},
		signature_method: credentials.signatureMethod as string,
		hash_function(base, key) {
			let algorithm: string;
			switch (credentials.signatureMethod) {
				case 'HMAC-SHA256':
					algorithm = 'sha256';
					break;
				case 'HMAC-SHA512':
					algorithm = 'sha512';
					break;
				default:
					algorithm = 'sha1';
					break;
			}
			return createHmac(algorithm, key).update(base).digest('base64');
		},
	});

	const oauthTokenData = credentials.oauthTokenData as IDataObject;

	const token: Token = {
		key: oauthTokenData.oauth_token as string,
		secret: oauthTokenData.oauth_token_secret as string,
	};

	// @ts-expect-error @TECH_DEBT: Remove request library
	requestOptions.data = { ...requestOptions.qs, ...requestOptions.form };

	// Fixes issue that OAuth1 library only works with "url" property and not with "uri"
	if ('uri' in requestOptions && !requestOptions.url) {
		requestOptions.url = requestOptions.uri;
		delete requestOptions.uri;
	}

	requestOptions.headers = oauth.toHeader(
		oauth.authorize(requestOptions as unknown as clientOAuth1.RequestOptions, token),
	) as unknown as Record<string, string>;
	if (isN8nRequest) {
		return await this.helpers.httpRequest(requestOptions as IHttpRequestOptions);
	}

	return await this.helpers
		.request(requestOptions as IRequestOptions)
		.catch(async (error: IResponseError) => {
			// Unknown error so simply throw it
			throw error;
		});
}

export async function refreshOAuth2Token(
	this: IAllExecuteFunctions,
	credentialsType: string,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
) {
	const credentials = (await this.getCredentials(
		credentialsType,
	)) as unknown as OAuth2CredentialData;
	if (credentials.grantType === 'authorizationCode' && credentials.oauthTokenData === undefined) {
		throw new UserError('OAuth credentials not connected');
	}

	const oAuthClient = createOAuth2Client(credentials);
	const oauthTokenData = credentials.oauthTokenData as ClientOAuth2TokenData;
	const token = buildSigningToken(oAuthClient, oauthTokenData, oAuth2Options);

	const newToken = await refreshOrFetchToken({
		credentials,
		token,
		credentialsType,
		node,
		additionalData,
		oAuth2Options,
		logger: this.logger,
		helpers: this.helpers,
		mode: this.getMode?.() ?? 'internal',
	});

	return newToken.data;
}
