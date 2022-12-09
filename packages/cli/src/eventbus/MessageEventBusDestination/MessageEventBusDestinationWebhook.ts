/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
import { MessageEventBusDestination } from './MessageEventBusDestination';
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageTypes } from '../EventMessageClasses';
import {
	deepCopy,
	ICredentialDataDecryptedObject,
	IDataObject,
	IOAuth2Options,
	IWorkflowExecuteAdditionalData,
	jsonParse,
	LoggerProxy,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationTypeNames,
	MessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationWebhookParameterItem,
	MessageEventBusDestinationWebhookParameterOptions,
	OAuth2GrantType,
} from 'n8n-workflow';
import { CredentialsHelper } from '../../CredentialsHelper';
import {
	UserSettings,
	requestOAuth1,
	requestOAuth2,
	requestWithAuthentication,
	NodeExecuteFunctions,
	IResponseError,
} from 'n8n-core';
import { Agent as HTTPSAgent } from 'https';
import config from '../../config';
import clientOAuth1, { Token } from 'oauth-1.0a';
import clientOAuth2 from 'client-oauth2';
import { getClientCredentialsToken } from 'n8n-core/src/OAuth2Helper';
import get from 'lodash.get';
import { OptionsWithUri, OptionsWithUrl, RequestCallback, RequiredUriUrl } from 'request';
import { isLogStreamingEnabled } from '../MessageEventBusHelper';

export const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

export class MessageEventBusDestinationWebhook
	extends MessageEventBusDestination
	implements MessageEventBusDestinationWebhookOptions
{
	__type: string = MessageEventBusDestinationTypeNames.webhook;

	url: string;

	responseCodeMustMatch = false;

	expectedStatusCode = 200;

	method = 'POST';

	authentication: 'predefinedCredentialType' | 'genericCredentialType' | 'none' = 'none';

	sendQuery = false;

	sendHeaders = false;

	genericAuthType = '';

	nodeCredentialType = '';

	specifyHeaders = '';

	specifyQuery = '';

	jsonQuery = '';

	jsonHeaders = '';

	headerParameters: MessageEventBusDestinationWebhookParameterItem = { parameters: [] };

	queryParameters: MessageEventBusDestinationWebhookParameterItem = { parameters: [] };

	options: MessageEventBusDestinationWebhookParameterOptions = {};

	sendPayload = true;

	credentialsHelper?: CredentialsHelper;

	axiosRequestOptions: AxiosRequestConfig;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super(options);
		this.url = options.url;
		this.label = options.label ?? 'Webhook Endpoint';
		if (options.__type) this.__type = options.__type;
		if (options.responseCodeMustMatch) this.responseCodeMustMatch = options.responseCodeMustMatch;
		if (options.expectedStatusCode) this.expectedStatusCode = options.expectedStatusCode;
		if (options.method) this.method = options.method;
		if (options.authentication) this.authentication = options.authentication;
		if (options.sendQuery) this.sendQuery = options.sendQuery;
		if (options.sendHeaders) this.sendHeaders = options.sendHeaders;
		if (options.genericAuthType) this.genericAuthType = options.genericAuthType;
		if (options.nodeCredentialType) this.nodeCredentialType = options.nodeCredentialType;
		if (options.specifyHeaders) this.specifyHeaders = options.specifyHeaders;
		if (options.specifyQuery) this.specifyQuery = options.specifyQuery;
		if (options.jsonQuery) this.jsonQuery = options.jsonQuery;
		if (options.jsonHeaders) this.jsonHeaders = options.jsonHeaders;
		if (options.headerParameters) this.headerParameters = options.headerParameters;
		if (options.queryParameters) this.queryParameters = options.queryParameters;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.options) this.options = options.options;
	}

	async matchDecryptedCredentialType(credentialType: string) {
		const foundCredential = Object.entries(this.credentials).find((e) => e[0] === credentialType);
		if (foundCredential) {
			const timezone = config.getEnv('generic.timezone');
			const credentialsDecrypted = await this.credentialsHelper?.getDecrypted(
				foundCredential[1],
				foundCredential[0],
				'internal',
				timezone,
				true,
			);
			return credentialsDecrypted;
		}
		return null;
	}

	async generateAxiosOptions() {
		if (this.axiosRequestOptions?.url) {
			return;
		}

		this.axiosRequestOptions = {
			headers: {},
			method: this.method as Method,
			url: this.url,
			maxRedirects: 0,
		} as AxiosRequestConfig;

		if (this.credentialsHelper === undefined) {
			let encryptionKey: string | undefined;
			try {
				encryptionKey = await UserSettings.getEncryptionKey();
			} catch (_) {}
			if (encryptionKey) {
				this.credentialsHelper = new CredentialsHelper(encryptionKey);
			}
		}

		const sendQuery = this.sendQuery;
		const specifyQuery = this.specifyQuery;
		const sendPayload = this.sendPayload;
		const sendHeaders = this.sendHeaders;
		const specifyHeaders = this.specifyHeaders;

		if (this.options.allowUnauthorizedCerts) {
			this.axiosRequestOptions.httpsAgent = new HTTPSAgent({ rejectUnauthorized: false });
		}

		if (this.options.redirect?.followRedirects) {
			this.axiosRequestOptions.maxRedirects = this.options.redirect?.maxRedirects;
		}

		// if (response?.response?.neverError === true) {
		// 	this.axiosRequestOptions.simple = false;
		// }

		if (this.options.proxy) {
			this.axiosRequestOptions.proxy = this.options.proxy;
		}

		if (this.options.timeout) {
			this.axiosRequestOptions.timeout = this.options.timeout;
		} else {
			this.axiosRequestOptions.timeout = 10000;
		}

		if (this.sendQuery && this.options.queryParameterArrays) {
			Object.assign(this.axiosRequestOptions, {
				qsStringifyOptions: { arrayFormat: this.options.queryParameterArrays },
			});
		}

		const parametersToKeyValue = async (
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			acc: Promise<{ [key: string]: any }>,
			cur: { name: string; value: string; parameterType?: string; inputDataFieldName?: string },
		) => {
			const acumulator = await acc;
			acumulator[cur.name] = cur.value;
			return acumulator;
		};

		// Get parameters defined in the UI
		if (sendQuery && this.queryParameters.parameters) {
			if (specifyQuery === 'keypair') {
				this.axiosRequestOptions.params = this.queryParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyQuery === 'json') {
				// query is specified using JSON
				try {
					JSON.parse(this.jsonQuery);
				} catch (_) {
					console.log(`JSON parameter need to be an valid JSON`);
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this.axiosRequestOptions.params = jsonParse(this.jsonQuery);
			}
		}

		// Get parameters defined in the UI
		if (sendHeaders && this.headerParameters.parameters) {
			if (specifyHeaders === 'keypair') {
				this.axiosRequestOptions.headers = await this.headerParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyHeaders === 'json') {
				// body is specified using JSON
				try {
					JSON.parse(this.jsonHeaders);
				} catch (_) {
					console.log(`JSON parameter need to be an valid JSON`);
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this.axiosRequestOptions.headers = jsonParse(this.jsonHeaders);
			}
		}

		// default for bodyContentType.raw
		if (this.axiosRequestOptions.headers === undefined) {
			this.axiosRequestOptions.headers = {};
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.axiosRequestOptions.headers['Content-Type'] = 'application/json';
	}

	serialize(): MessageEventBusDestinationWebhookOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			url: this.url,
			responseCodeMustMatch: this.responseCodeMustMatch,
			expectedStatusCode: this.expectedStatusCode,
			method: this.method,
			authentication: this.authentication,
			sendQuery: this.sendQuery,
			sendHeaders: this.sendHeaders,
			genericAuthType: this.genericAuthType,
			nodeCredentialType: this.nodeCredentialType,
			specifyHeaders: this.specifyHeaders,
			specifyQuery: this.specifyQuery,
			jsonQuery: this.jsonQuery,
			jsonHeaders: this.jsonHeaders,
			headerParameters: this.headerParameters,
			queryParameters: this.queryParameters,
			sendPayload: this.sendPayload,
			options: this.options,
			credentials: this.credentials,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationWebhook | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.webhook &&
			isMessageEventBusDestinationWebhookOptions(data)
		) {
			return new MessageEventBusDestinationWebhook(data);
		}
		return null;
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		if (!isLogStreamingEnabled()) return false;

		// at first run, build this.requestOptions with the destination settings
		await this.generateAxiosOptions();

		if (this.anonymizeAuditMessages || msg.anonymize) {
			msg = msg.anonymize();
		}

		if (['PATCH', 'POST', 'PUT', 'GET'].includes(this.method.toUpperCase())) {
			if (this.sendPayload) {
				this.axiosRequestOptions.data = {
					...msg,
					ts: msg.ts.toISO(),
				};
			} else {
				this.axiosRequestOptions.data = {
					...msg,
					ts: msg.ts.toISO(),
					payload: undefined,
				};
			}
		}

		// TODO: implement extra auth requests
		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;

		if (this.authentication === 'genericCredentialType') {
			if (this.genericAuthType === 'httpBasicAuth') {
				try {
					httpBasicAuth = await this.matchDecryptedCredentialType('httpBasicAuth');
				} catch (_) {}
			} else if (this.genericAuthType === 'httpDigestAuth') {
				try {
					httpDigestAuth = await this.matchDecryptedCredentialType('httpDigestAuth');
				} catch (_) {}
			} else if (this.genericAuthType === 'httpHeaderAuth') {
				try {
					httpHeaderAuth = await this.matchDecryptedCredentialType('httpHeaderAuth');
				} catch (_) {}
			} else if (this.genericAuthType === 'httpQueryAuth') {
				try {
					httpQueryAuth = await this.matchDecryptedCredentialType('httpQueryAuth');
				} catch (_) {}
			} else if (this.genericAuthType === 'oAuth1Api') {
				try {
					oAuth1Api = await this.matchDecryptedCredentialType('oAuth1Api');
				} catch (_) {}
			} else if (this.genericAuthType === 'oAuth2Api') {
				try {
					oAuth2Api = await this.matchDecryptedCredentialType('oAuth2Api');
				} catch (_) {}
			}
			// } else if (this.authentication === 'predefinedCredentialType') {
			// 	try {
			// 		nodeCredentialType = this.getNodeParameter('nodeCredentialType', 0) as string;
			// 	} catch (_) {}
		}

		// if (this.authentication === 'genericCredentialType' || this.authentication === 'none') {

		let authRequestPromise;
		// TODO:
		// if (oAuth1Api || oAuth2Api) {
		// 	const authRequestOptions = {
		// 		headers: this.axiosRequestOptions.headers,
		// 		method: this.axiosRequestOptions.method,
		// 		uri: this.axiosRequestOptions.url,
		// 		gzip: true,
		// 		rejectUnauthorized: !this.options.allowUnauthorizedCerts || false,
		// 		followRedirect: this.options.redirect?.followRedirects ?? false,
		// 	};
		// 	if (oAuth1Api) {
		// 		const requestOAuth1Request = requestOAuth1.call(
		// 			NodeExecuteFunctions,
		// 			'oAuth1Api',
		// 			authRequestOptions,
		// 		);
		// 		requestOAuth1Request.catch((error: any) => {
		// 			console.error(error);
		// 		});
		// 		authRequestPromise = requestOAuth1Request;
		// 	} else if (oAuth2Api) {
		// 		const requestOAuth2Request = requestOAuth2.call(
		// 			NodeExecuteFunctions,
		// 			'oAuth2Api',
		// 			authRequestOptions,
		// 			{
		// 				tokenType: 'Bearer',
		// 			},
		// 		);
		// 		requestOAuth2Request.catch((error: any) => {
		// 			console.error(error);
		// 		});
		// 		authRequestPromise = requestOAuth2Request;
		// 	} else {
		// 		// bearerAuth, queryAuth, headerAuth, digestAuth, none
		// 		// const request = this.helpers.request(requestOptions);
		// 		// authRequestPromise = axios.request(requestOptions);
		// 		// authRequestPromise.catch(() => {});
		// 	}
		// }

		if (httpBasicAuth) {
			// Add credentials if any are set
			this.axiosRequestOptions.auth = {
				username: httpBasicAuth.user as string,
				password: httpBasicAuth.password as string,
			};
		} else if (httpHeaderAuth) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			this.axiosRequestOptions.headers[httpHeaderAuth.name as string] = httpHeaderAuth.value;
		} else if (httpQueryAuth) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			this.axiosRequestOptions.params[httpQueryAuth.name as string] = httpQueryAuth.value;
		} else if (httpDigestAuth) {
			this.axiosRequestOptions.auth = {
				username: httpDigestAuth.user as string,
				password: httpDigestAuth.password as string,
			};
		}

		try {
			if (authRequestPromise) {
				const authRequestResponse = await authRequestPromise;
			}

			const requestResponse = await axios.request(this.axiosRequestOptions);

			if (this.responseCodeMustMatch) {
				if (requestResponse.status === this.expectedStatusCode) {
					await eventBus.confirmSent(msg, { id: this.id, name: this.label });
					return true;
				} else {
					return false;
				}
			}

			await eventBus.confirmSent(msg, { id: this.id, name: this.label });
			return true;
		} catch (error) {
			console.error(error);
		}
		return false;
	}

	// async requestOAuth2(
	// 	credentials: ICredentialDataDecryptedObject,
	// 	requestOptions: AxiosRequestConfig,
	// 	additionalData: IWorkflowExecuteAdditionalData,
	// 	oAuth2Options?: IOAuth2Options,
	// ) {
	// 	const credentialsType: string = 'oAuth2Api';
	// 	const oauthRequestOptions = deepCopy(this.axiosRequestOptions);
	// 	// const credentials = await this.getCredentials(credentialsType);

	// 	// Only the OAuth2 with authorization code grant needs connection
	// 	if (
	// 		credentials.grantType === OAuth2GrantType.authorizationCode &&
	// 		credentials.oauthTokenData === undefined
	// 	) {
	// 		throw new Error('OAuth credentials not connected!');
	// 	}

	// 	const oAuthClient = new clientOAuth2({
	// 		clientId: credentials.clientId as string,
	// 		clientSecret: credentials.clientSecret as string,
	// 		accessTokenUri: credentials.accessTokenUrl as string,
	// 		scopes: (credentials.scope as string).split(' '),
	// 	});

	// 	let oauthTokenData = credentials.oauthTokenData as clientOAuth2.Data;

	// 	// if it's the first time using the credentials, get the access token and save it into the DB.
	// 	if (
	// 		credentials.grantType === OAuth2GrantType.clientCredentials &&
	// 		oauthTokenData === undefined
	// 	) {
	// 		const { data } = await getClientCredentialsToken(oAuthClient, credentials);

	// 		const nodeCredentials = this.credentials[credentialsType];

	// 		// Save the refreshed token
	// 		await additionalData.credentialsHelper.updateCredentials(
	// 			nodeCredentials,
	// 			credentialsType,
	// 			Object.assign(credentials, { oauthTokenData: data }),
	// 		);

	// 		oauthTokenData = data;
	// 	}

	// 	const token = oAuthClient.createToken(
	// 		get(oauthTokenData, oAuth2Options?.property as string) || oauthTokenData.accessToken,
	// 		oauthTokenData.refreshToken,
	// 		oAuth2Options?.tokenType || oauthTokenData.tokenType,
	// 		oauthTokenData,
	// 	);
	// 	// Signs the request by adding authorization headers or query parameters depending
	// 	// on the token-type used.
	// 	const newRequestOptions = token.sign(requestOptions as unknown as clientOAuth2.RequestObject);
	// 	const newRequestHeaders = (newRequestOptions.headers = newRequestOptions.headers ?? {});
	// 	// If keep bearer is false remove the it from the authorization header
	// 	if (
	// 		oAuth2Options?.keepBearer === false &&
	// 		typeof newRequestHeaders.Authorization === 'string'
	// 	) {
	// 		newRequestHeaders.Authorization = newRequestHeaders.Authorization.split(' ')[1];
	// 	}

	// 	if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
	// 		Object.assign(newRequestHeaders, {
	// 			[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
	// 		});
	// 	}

	// 	const requestResponse = await axios.request(this.axiosRequestOptions);

	// 	return this.helpers.request!(newRequestOptions).catch(async (error: IResponseError) => {
	// 		const statusCodeReturned =
	// 			oAuth2Options?.tokenExpiredStatusCode === undefined
	// 				? 401
	// 				: oAuth2Options?.tokenExpiredStatusCode;

	// 		if (error.statusCode === statusCodeReturned) {
	// 			// Token is probably not valid anymore. So try refresh it.

	// 			const tokenRefreshOptions: IDataObject = {};

	// 			if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
	// 				const body: IDataObject = {
	// 					client_id: credentials.clientId,
	// 					client_secret: credentials.clientSecret,
	// 				};
	// 				tokenRefreshOptions.body = body;
	// 				// Override authorization property so the credentials are not included in it
	// 				tokenRefreshOptions.headers = {
	// 					Authorization: '',
	// 				};
	// 			}

	// 			LoggerProxy.debug(
	// 				`OAuth2 token for "${credentialsType}" used by node "${this.label}" expired. Should revalidate.`,
	// 			);

	// 			let newToken;

	// 			// if it's OAuth2 with client credentials grant type, get a new token
	// 			// instead of refreshing it.
	// 			if (OAuth2GrantType.clientCredentials === credentials.grantType) {
	// 				newToken = await getClientCredentialsToken(token.client, credentials);
	// 			} else {
	// 				newToken = await token.refresh(tokenRefreshOptions);
	// 			}

	// 			LoggerProxy.debug(
	// 				`OAuth2 token for "${credentialsType}" used by node "${this.label}" has been renewed.`,
	// 			);

	// 			credentials.oauthTokenData = newToken.data;

	// 			// Find the credentials
	// 			if (!this.credentials?.[credentialsType]) {
	// 				throw new Error(
	// 					`The node "${this.label}" does not have credentials of type "${credentialsType}"!`,
	// 				);
	// 			}
	// 			const nodeCredentials = this.credentials[credentialsType];

	// 			// Save the refreshed token
	// 			await additionalData.credentialsHelper.updateCredentials(
	// 				nodeCredentials,
	// 				credentialsType,
	// 				credentials as unknown as ICredentialDataDecryptedObject,
	// 			);

	// 			LoggerProxy.debug(
	// 				`OAuth2 token for "${credentialsType}" used by node "${this.label}" has been saved to database successfully.`,
	// 			);

	// 			// Make the request again with the new token
	// 			const newRequestOptions = newToken.sign(
	// 				requestOptions as unknown as clientOAuth2.RequestObject,
	// 			);
	// 			newRequestOptions.headers = newRequestOptions.headers ?? {};

	// 			if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
	// 				Object.assign(newRequestOptions.headers, {
	// 					[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
	// 				});
	// 			}

	// 			return this.helpers.request!(newRequestOptions);
	// 		}

	// 		// Unknown error so simply throw it
	// 		throw error;
	// 	});
	// }
}
