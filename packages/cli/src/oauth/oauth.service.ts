import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import Csrf from 'csrf';
import type { Response } from 'express';
import { Credentials, Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import {
	GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import {
	ClientOAuth2,
	type ClientOAuth2Options,
	type OAuth2AuthenticationMethod,
	type OAuth2CredentialData,
	type OAuth2GrantType,
} from '@n8n/client-oauth2';
import axios from 'axios';
import {
	oAuthAuthorizationServerMetadataSchema,
	dynamicClientRegistrationResponseSchema,
} from '@/controllers/oauth/oauth2-dynamic-client-registration.schema';
import pkceChallenge from 'pkce-challenge';
import * as qs from 'querystring';
import split from 'lodash/split';
import { ExternalHooks } from '@/external-hooks';
import type { AxiosRequestConfig } from 'axios';
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

export function shouldSkipAuthOnOAuthCallback() {
	const value = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK?.toLowerCase() ?? 'false';
	return value === 'true';
}

export const skipAuthOnOAuthCallback = shouldSkipAuthOnOAuthCallback();

export { OauthVersion, type OAuth1CredentialData, type CreateCsrfStateData, type CsrfState };

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
	) {}

	getBaseUrl(oauthVersion: OauthVersion) {
		const restUrl = `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}`;
		return `${restUrl}/oauth${oauthVersion}-credential`;
	}

	async getCredential(
		req: OAuthRequest.OAuth1Credential.Auth | OAuthRequest.OAuth2Credential.Auth,
	): Promise<CredentialsEntity> {
		const { id: credentialId } = req.query;

		if (!credentialId) {
			throw new BadRequestError('Required credential ID is missing');
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:read'],
		);

		if (!credential) {
			this.logger.error(
				'OAuth credential authorization failed because the current user does not have the correct permissions',
				{ userId: req.user.id },
			);
			throw new NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
		}

		return credential;
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
			credential,
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
		const credentials = new Credentials(credential, credential.type, credential.data);
		credentials.updateData(toUpdate, toDelete);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	/** Get a credential without user check */
	protected async getCredentialWithoutUser(
		credentialId: string,
	): Promise<CredentialsEntity | null> {
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	createCsrfState(data: CreateCsrfStateData): [string, string] {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const state: CsrfState = {
			token: token.create(csrfSecret),
			createdAt: Date.now(),
			...data,
		};
		const encryptedState = this.cipher.encrypt(JSON.stringify(state));
		return [csrfSecret, encryptedState];
	}

	protected decodeCsrfState(encodedState: string, req: AuthenticatedRequest): CsrfState {
		const errorMessage = 'Invalid state format';
		const decryptedState = this.cipher.decrypt(encodedState);
		const decoded = jsonParse<CsrfState>(decryptedState, {
			errorMessage,
		});

		if (typeof decoded.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new UnexpectedError(errorMessage);
		}

		// user validation not required for dynamic credentials
		if (decoded.origin === 'dynamic-credential') {
			return decoded;
		}

		if (decoded.userId !== req.user?.id) {
			throw new AuthError('Unauthorized');
		}

		return decoded;
	}

	protected verifyCsrfState(
		decrypted: ICredentialDataDecryptedObject & { csrfSecret?: string },
		state: CsrfState,
	) {
		const token = new Csrf();

		return (
			Date.now() - state.createdAt <= MAX_CSRF_AGE &&
			decrypted.csrfSecret !== undefined &&
			token.verify(decrypted.csrfSecret, state.token)
		);
	}

	async resolveCredential<T>(
		req: OAuthRequest.OAuth1Credential.Callback | OAuthRequest.OAuth2Credential.Callback,
	): Promise<[CredentialsEntity, ICredentialDataDecryptedObject, T, CsrfState]> {
		const { state: encodedState } = req.query;
		const state = this.decodeCsrfState(encodedState, req);
		const credential = await this.getCredentialWithoutUser(state.cid);
		if (!credential) {
			throw new UnexpectedError('OAuth callback failed because of insufficient permissions');
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

		if (!this.verifyCsrfState(decryptedDataOriginal, state)) {
			throw new UnexpectedError('The OAuth callback state is invalid!');
		}

		return [credential, decryptedDataOriginal, oauthCredentials, state];
	}

	renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}

	async getOAuthCredentials<T>(credential: CredentialsEntity): Promise<T> {
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);

		// At some point in the past we saved hidden scopes to credentials (but shouldn't)
		// Delete scope before applying defaults to make sure new scopes are present on reconnect
		// Generic Oauth2 API is an exception because it needs to save the scope
		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			!GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE.includes(credential.type)
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

	async generateAOauth2AuthUri(
		credential: CredentialsEntity,
		csrfData: CreateCsrfStateData,
	): Promise<string> {
		const oauthCredentials: OAuth2CredentialData =
			await this.getOAuthCredentials<OAuth2CredentialData>(credential);

		const toUpdate: ICredentialDataDecryptedObject = {};

		if (oauthCredentials.useDynamicClientRegistration && oauthCredentials.serverUrl) {
			const serverUrl = new URL(oauthCredentials.serverUrl);
			const { data } = await axios.get<unknown>(
				`${serverUrl.origin}/.well-known/oauth-authorization-server`,
			);
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
			const scope = scopes_supported ? scopes_supported.join(' ') : undefined;
			if (scope) {
				oauthCredentials.scope = scope;
				toUpdate.scope = scope;
			}

			const { grantType, authentication } = this.selectGrantTypeAndAuthenticationMethod(
				metadataValidation.data.grant_types_supported ?? ['authorization_code', 'implicit'],
				metadataValidation.data.token_endpoint_auth_methods_supported ?? ['client_secret_basic'],
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
			};

			await this.externalHooks.run('oauth2.dynamicClientRegistration', [registerPayload]);

			const { data: registerResult } = await axios.post<unknown>(
				registration_endpoint,
				registerPayload,
			);
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

		// Generate a CSRF prevention token and send it as an OAuth2 state string
		const [csrfSecret, state] = this.createCsrfState(csrfData);

		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};

		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}

		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		toUpdate.csrfSecret = csrfSecret;
		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = await pkceChallenge();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			toUpdate.codeVerifier = code_verifier;
		}

		await this.encryptAndSaveData(credential, toUpdate);

		const oAuthObj = new ClientOAuth2(oAuthOptions);
		const returnUri = oAuthObj.code.getUri();

		this.logger.debug('OAuth2 authorization url created for credential', {
			csrfData,
			credentialId: credential.id,
		});

		return returnUri.toString();
	}

	async generateAOauth1AuthUri(
		credential: CredentialsEntity,
		csrfData: CreateCsrfStateData,
	): Promise<string> {
		const oauthCredentials: OAuth1CredentialData =
			await this.getOAuthCredentials<OAuth1CredentialData>(credential);

		const [csrfSecret, state] = this.createCsrfState(csrfData);

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

		const axiosConfig: AxiosRequestConfig = {
			method: options.method,
			url: options.url,
			headers: {
				...data,
			},
		};

		const { data: response } = await axios.request(axiosConfig);

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

		const returnUri = `${oauthCredentials.authUrl}?oauth_token=${responseJson.oauth_token}`;

		await this.encryptAndSaveData(credential, { csrfSecret }, []);

		this.logger.debug('OAuth1 authorization url created for credential', {
			csrfData,
			credentialId: credential.id,
		});

		return returnUri;
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

	private selectGrantTypeAndAuthenticationMethod(
		grantTypes: string[],
		tokenEndpointAuthMethods: string[],
		codeChallengeMethods: string[],
	): { grantType: OAuth2GrantType; authentication?: OAuth2AuthenticationMethod } {
		if (grantTypes.includes('authorization_code') && grantTypes.includes('refresh_token')) {
			if (codeChallengeMethods.includes('S256')) {
				return { grantType: 'pkce' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'authorizationCode', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'authorizationCode', authentication: 'body' };
			}
		}

		if (grantTypes.includes('client_credentials')) {
			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'clientCredentials', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'clientCredentials', authentication: 'body' };
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
	) {
		const credentials = new Credentials(credential, credential.type, credential.data);
		credentials.updateData(oauthTokenData, ['csrfSecret']);

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
			//  todo parse this
			{ version: 1, identity: authHeader },
			credentials.getData(),
			{ credentialResolverId },
		);
	}
}
