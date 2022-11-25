/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from './MessageEventBusDestination';
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageTypes } from '../EventMessageClasses';
import { MessageEventBusDestinationTypeNames } from '.';
import { INodeCredentials, jsonParse } from 'n8n-workflow';
import { CredentialsHelper } from '../../CredentialsHelper';
import { UserSettings, requestOAuth1, requestOAuth2, requestWithAuthentication } from 'n8n-core';
import { Agent as HTTPSAgent } from 'https';

export const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

interface ParameterItem {
	parameters: Array<{
		name: string;
		value: string | number | boolean | null | undefined;
	}>;
}

interface ParameterOptions {
	batch?: {
		batchSize?: number;
		batchInterval?: number;
	};
	allowUnauthorizedCerts?: boolean;
	queryParameterArrays?: 'indices' | 'brackets' | 'repeat';
	redirect?: {
		followRedirects?: boolean;
		maxRedirects?: number;
	};
	response?: {
		response?: {
			fullResponse?: boolean;
			neverError?: boolean;
			responseFormat?: string;
			outputPropertyName?: string;
		};
	};
	proxy?: {
		protocol: 'https' | 'http';
		host: string;
		port: number;
	};
	timeout?: number;
}

export interface MessageEventBusDestinationWebhookOptions
	extends MessageEventBusDestinationOptions {
	url: string;
	responseCodeMustMatch?: boolean;
	expectedStatusCode?: number;
	method?: string;
	authentication?: 'predefinedCredentialType' | 'genericCredentialType' | 'none';
	sendQuery?: boolean;
	sendHeaders?: boolean;
	genericAuthType?: string;
	nodeCredentialType?: string;
	specifyHeaders?: string;
	specifyQuery?: string;
	jsonQuery?: string;
	jsonHeaders?: string;
	headerParameters?: ParameterItem;
	queryParameters?: ParameterItem;
	sendPayload?: boolean;
	options?: ParameterOptions;
	credentials?: INodeCredentials;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
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

	headerParameters: ParameterItem = { parameters: [] };

	queryParameters: ParameterItem = { parameters: [] };

	options: ParameterOptions = {};

	sendPayload = true;

	credentials: INodeCredentials = {};

	credentialsHelper?: CredentialsHelper;

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
		if (options.credentials) this.credentials = options.credentials;
	}

	// async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
	// 	console.log('URL', this.url);
	// 	try {
	// 		if (this.responseCodeMustMatch) {
	// 			const postResult = await axios.post(this.url, msg);
	// 			if (postResult.status === this.expectedStatusCode) {
	// 				await eventBus.confirmSent(msg);
	// 			}
	// 		} else {
	// 			await axios.post(this.url, msg);
	// 			await eventBus.confirmSent(msg);
	// 		}
	// 		return true;
	// 	} catch (error) {
	// 		console.log(error.message);
	// 	}
	// 	return false;
	// }

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
		if (this.credentialsHelper === undefined) {
			let encryptionKey: string | undefined;
			try {
				encryptionKey = await UserSettings.getEncryptionKey();
			} catch (_) {}
			if (encryptionKey) {
				this.credentialsHelper = new CredentialsHelper(encryptionKey);
			}
		}

		// const items = this.getInputData();

		// const fullReponseProperties = ['body', 'headers', 'statusCode', 'statusMessage'];

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;
		let nodeCredentialType;

		if (this.authentication === 'genericCredentialType') {
			// const genericAuthType = this.genericAuthType;
			// 	if (genericAuthType === 'httpBasicAuth') {
			// 		try {
			// 			httpBasicAuth = await this.getCredentials('httpBasicAuth');
			// 		} catch (_) {}
			// 	} else if (genericAuthType === 'httpDigestAuth') {
			// 		try {
			// 			httpDigestAuth = await this.getCredentials('httpDigestAuth');
			// 		} catch (_) {}
			// 	} else if (genericAuthType === 'httpHeaderAuth') {
			// 		try {
			// 			httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
			// 		} catch (_) {}
			// 	} else if (genericAuthType === 'httpQueryAuth') {
			// 		try {
			// 			httpQueryAuth = await this.getCredentials('httpQueryAuth');
			// 		} catch (_) {}
			// 	} else if (genericAuthType === 'oAuth1Api') {
			// 		try {
			// 			oAuth1Api = await this.getCredentials('oAuth1Api');
			// 		} catch (_) {}
			// 	} else if (genericAuthType === 'oAuth2Api') {
			// 		try {
			// 			oAuth2Api = await this.getCredentials('oAuth2Api');
			// 		} catch (_) {}
			// 	}
			// } else if (authentication === 'predefinedCredentialType') {
			// 	try {
			// 		nodeCredentialType = this.getNodeParameter('nodeCredentialType', 0) as string;
			// 	} catch (_) {}
		}

		let requestPromise: Promise<AxiosResponse>;

		// let fullResponse = false;

		// let autoDetectResponseFormat = false;

		const sendQuery = this.sendQuery;
		// const queryParameters = this.queryParameters.parameters;
		const specifyQuery = this.specifyQuery;
		// const jsonQueryParameter = this.jsonQuery;

		const sendPayload = this.sendPayload;

		const sendHeaders = this.sendHeaders;
		// const headerParameters = this.headerParameters.parameters;
		const specifyHeaders = this.specifyHeaders;
		// const jsonHeadersParameter = this.jsonHeaders;

		// const { proxy, timeout, queryParameterArrays, response } = this.options as {
		// 	proxy: string;
		// 	timeout: number;
		// 	queryParameterArrays: 'indices' | 'brackets' | 'repeat';
		// 	response: {
		// 		response: { neverError: boolean; responseFormat: string; fullResponse: boolean };
		// 	};
		// };

		// const responseFormat = this.options.response?.response?.responseFormat ?? 'autodetect';

		// fullResponse = this.options.response?.response?.fullResponse ?? false;

		// autoDetectResponseFormat = responseFormat === 'autodetect';

		const requestOptions: AxiosRequestConfig = {
			headers: {},
			method: this.method as Method,
			url: this.url,
			maxRedirects: 0,
		};

		if (this.options.allowUnauthorizedCerts) {
			requestOptions.httpsAgent = new HTTPSAgent({ rejectUnauthorized: false });
		}

		// When response format is set to auto-detect,
		// we need to access to response header content-type
		// and the only way is using "resolveWithFullResponse"
		// if (autoDetectResponseFormat || fullResponse) {
		// 	requestOptions.resolveWithFullResponse = true;
		// }

		if (this.options.redirect?.followRedirects) {
			requestOptions.maxRedirects = this.options.redirect?.maxRedirects;
		}

		// if (redirect?.redirect?.maxRedirects) {
		// 	requestOptions.maxRedirects = redirect?.redirect?.maxRedirects;
		// }

		// if (response?.response?.neverError === true) {
		// 	requestOptions.simple = false;
		// }

		// TODO: very simplistic parsing, adjust input for to match axios proxy fields
		if (this.options.proxy) {
			requestOptions.proxy = this.options.proxy;
		}

		if (this.options.timeout) {
			requestOptions.timeout = this.options.timeout;
		} else {
			requestOptions.timeout = 10000;
		}

		if (this.sendQuery && this.options.queryParameterArrays) {
			Object.assign(requestOptions, {
				qsStringifyOptions: { arrayFormat: this.options.queryParameterArrays },
			});
		}

		if (['PATCH', 'POST', 'PUT', 'GET'].includes(this.method.toUpperCase())) {
			if (sendPayload) {
				requestOptions.data = {
					...msg,
				};
			} else {
				requestOptions.data = {
					...msg,
					payload: undefined,
				};
			}
		}

		const parmetersToKeyValue = async (
			// tslint:disable-next-line: no-any
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
				requestOptions.params = this.queryParameters.parameters.reduce(
					parmetersToKeyValue,
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
				requestOptions.params = jsonParse(this.jsonQuery);
			}
		}

		// Get parameters defined in the UI
		if (sendHeaders && this.headerParameters.parameters) {
			if (specifyHeaders === 'keypair') {
				requestOptions.headers = this.headerParameters.parameters.reduce(
					parmetersToKeyValue,
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
				requestOptions.headers = jsonParse(this.jsonHeaders);
			}
		}

		// default for bodyContentType.raw
		// requestOptions.json = false;
		if (requestOptions.headers === undefined) {
			requestOptions.headers = {};
		}
		const rawContentType = 'application/json';
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		requestOptions.headers['Content-Type'] = rawContentType;

		//TODO
		// Add credentials if any are set
		// if (httpBasicAuth !== undefined) {
		// 	requestOptions.auth = {
		// 		user: httpBasicAuth.user as string,
		// 		pass: httpBasicAuth.password as string,
		// 	};
		// }
		// if (httpHeaderAuth !== undefined) {
		// 	requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
		// }
		// if (httpQueryAuth !== undefined) {
		// 	if (!requestOptions.qs) {
		// 		requestOptions.qs = {};
		// 	}
		// 	requestOptions.qs![httpQueryAuth.name as string] = httpQueryAuth.value;
		// }
		// if (httpDigestAuth !== undefined) {
		// 	requestOptions.auth = {
		// 		user: httpDigestAuth.user as string,
		// 		pass: httpDigestAuth.password as string,
		// 		sendImmediately: false,
		// 	};
		// }

		// if (requestOptions.headers.accept === undefined) {
		// 	if (responseFormat === 'json') {
		// 		requestOptions.headers.accept = 'application/json,text/*;q=0.99';
		// 	} else if (responseFormat === 'text') {
		// 		requestOptions.headers.accept =
		// 			'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, */*;q=0.1';
		// 	} else {
		// 		requestOptions.headers.accept =
		// 			'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, image/*;q=0.8, */*;q=0.7';
		// 	}
		// }

		// try {
		// 	let sendRequest: any = requestOptions; // tslint:disable-line:no-any
		// 	// Protect browser from sending large binary data
		// 	if (Buffer.isBuffer(sendRequest.body) && sendRequest.body.length > 250000) {
		// 		sendRequest = {
		// 			...requestOptions,
		// 			body: `Binary data got replaced with this text. Original was a Buffer with a size of ${requestOptions.body.length} byte.`,
		// 		};
		// 	}
		// } catch (e) {}

		if (this.authentication === 'genericCredentialType' || this.authentication === 'none') {
			if (oAuth1Api) {
				// const requestOAuth1Request = requestOAuth1.call(this, 'oAuth1Api', requestOptions);
				// requestOAuth1Request.catch(() => {});
				// requestPromise = requestOAuth1Request;
			} else if (oAuth2Api) {
				// const requestOAuth2Request = requestOAuth2.call(this, 'oAuth2Api', requestOptions, {
				// 	tokenType: 'Bearer',
				// });
				// requestOAuth2Request.catch(() => {});
				// requestPromise = requestOAuth2Request;
			} else {
				// bearerAuth, queryAuth, headerAuth, digestAuth, none
				// const request = this.helpers.request(requestOptions);
				//TODO:
				requestPromise = axios.request(requestOptions);
				requestPromise.catch(() => {});
			}
		} else if (this.authentication === 'predefinedCredentialType' && nodeCredentialType) {
			// const additionalOAuth2Options = getOAuth2AdditionalParameters(nodeCredentialType);
			// // service-specific cred: OAuth1, OAuth2, plain
			// const requestWithAuthenticationRequest = requestWithAuthentication.call(
			// 	this,
			// 	nodeCredentialType,
			// 	requestOptions,
			// 	additionalOAuth2Options && { oauth2: additionalOAuth2Options },
			// );
			// requestWithAuthenticationRequest.catch(() => {});
			// requestPromise = requestWithAuthenticationRequest;
		}
		// }
		// TODO: auth
		requestPromise = axios.request(requestOptions);
		requestPromise.catch(() => {});
		const requestResponse = await requestPromise;

		if (this.responseCodeMustMatch) {
			return requestResponse.status === this.expectedStatusCode;
		}
		return true;

		// let response: any; // tslint:disable-line:no-any
		// for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// @ts-ignore
		// response = promisesResponses.shift();
	}
}
