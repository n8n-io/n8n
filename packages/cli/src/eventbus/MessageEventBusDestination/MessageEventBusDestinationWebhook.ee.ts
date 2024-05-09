/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import axios from 'axios';
import type { AxiosRequestConfig, Method } from 'axios';
import { jsonParse, MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationWebhookParameterItem,
	MessageEventBusDestinationWebhookParameterOptions,
	IWorkflowExecuteAdditionalData,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import { CredentialsHelper } from '@/CredentialsHelper';
import { Agent as HTTPSAgent } from 'https';
import { isLogStreamingEnabled } from '../MessageEventBus/MessageEventBusHelper';
import { eventMessageGenericDestinationTestEvent } from '../EventMessageClasses/EventMessageGeneric';
import type { MessageEventBus, MessageWithCallback } from '../MessageEventBus/MessageEventBus';
import * as SecretsHelpers from '@/ExternalSecrets/externalSecretsHelper.ee';
import Container from 'typedi';

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

	constructor(
		eventBusInstance: MessageEventBus,
		options: MessageEventBusDestinationWebhookOptions,
	) {
		super(eventBusInstance, options);
		this.url = options.url;
		this.label = options.label ?? 'Webhook Endpoint';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.webhook;
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

		this.logger.debug(`MessageEventBusDestinationWebhook with id ${this.getId()} initialized`);
	}

	async matchDecryptedCredentialType(credentialType: string) {
		const foundCredential = Object.entries(this.credentials).find((e) => e[0] === credentialType);
		if (foundCredential) {
			const credentialsDecrypted = await this.credentialsHelper?.getDecrypted(
				{ secretsHelpers: SecretsHelpers } as unknown as IWorkflowExecuteAdditionalData,
				foundCredential[1],
				foundCredential[0],
				'internal',
				undefined,
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
			this.credentialsHelper = Container.get(CredentialsHelper);
		}

		const sendQuery = this.sendQuery;
		const specifyQuery = this.specifyQuery;
		const sendHeaders = this.sendHeaders;
		const specifyHeaders = this.specifyHeaders;

		if (this.options.allowUnauthorizedCerts) {
			this.axiosRequestOptions.httpsAgent = new HTTPSAgent({ rejectUnauthorized: false });
		}

		if (this.options.redirect?.followRedirects) {
			this.axiosRequestOptions.maxRedirects = this.options.redirect?.maxRedirects;
		}

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
			acc: Promise<{ [key: string]: any }>,
			cur: { name: string; value: string; parameterType?: string; inputDataFieldName?: string },
		) => {
			const accumulator = await acc;
			accumulator[cur.name] = cur.value;
			return accumulator;
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
				} catch {
					this.logger.error('JSON parameter need to be an valid JSON');
				}
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
				} catch {
					this.logger.error('JSON parameter need to be an valid JSON');
				}
				this.axiosRequestOptions.headers = jsonParse(this.jsonHeaders);
			}
		}

		// default for bodyContentType.raw
		if (this.axiosRequestOptions.headers === undefined) {
			this.axiosRequestOptions.headers = {};
		}
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
		eventBusInstance: MessageEventBus,
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationWebhook | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.webhook &&
			isMessageEventBusDestinationWebhookOptions(data)
		) {
			return new MessageEventBusDestinationWebhook(eventBusInstance, data);
		}
		return null;
	}

	// eslint-disable-next-line complexity
	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		// at first run, build this.requestOptions with the destination settings
		await this.generateAxiosOptions();

		const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;

		if (['PATCH', 'POST', 'PUT', 'GET'].includes(this.method.toUpperCase())) {
			if (this.sendPayload) {
				this.axiosRequestOptions.data = {
					...msg,
					__type: undefined,
					payload,
					ts: msg.ts.toISO(),
				};
			} else {
				this.axiosRequestOptions.data = {
					...msg,
					__type: undefined,
					payload: undefined,
					ts: msg.ts.toISO(),
				};
			}
		}

		// TODO: implement extra auth requests
		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;

		if (this.authentication === 'genericCredentialType') {
			if (this.genericAuthType === 'httpBasicAuth') {
				try {
					httpBasicAuth = await this.matchDecryptedCredentialType('httpBasicAuth');
				} catch {}
			} else if (this.genericAuthType === 'httpDigestAuth') {
				try {
					httpDigestAuth = await this.matchDecryptedCredentialType('httpDigestAuth');
				} catch {}
			} else if (this.genericAuthType === 'httpHeaderAuth') {
				try {
					httpHeaderAuth = await this.matchDecryptedCredentialType('httpHeaderAuth');
				} catch {}
			} else if (this.genericAuthType === 'httpQueryAuth') {
				try {
					httpQueryAuth = await this.matchDecryptedCredentialType('httpQueryAuth');
				} catch {}
			}
		}

		if (httpBasicAuth) {
			// Add credentials if any are set
			this.axiosRequestOptions.auth = {
				username: httpBasicAuth.user as string,
				password: httpBasicAuth.password as string,
			};
		} else if (httpHeaderAuth) {
			this.axiosRequestOptions.headers = {
				...this.axiosRequestOptions.headers,
				[httpHeaderAuth.name as string]: httpHeaderAuth.value as string,
			};
		} else if (httpQueryAuth) {
			this.axiosRequestOptions.params = {
				...this.axiosRequestOptions.params,
				[httpQueryAuth.name as string]: httpQueryAuth.value as string,
			};
		} else if (httpDigestAuth) {
			this.axiosRequestOptions.auth = {
				username: httpDigestAuth.user as string,
				password: httpDigestAuth.password as string,
			};
		}

		try {
			const requestResponse = await axios.request(this.axiosRequestOptions);
			if (requestResponse) {
				if (this.responseCodeMustMatch) {
					if (requestResponse.status === this.expectedStatusCode) {
						confirmCallback(msg, { id: this.id, name: this.label });
						sendResult = true;
					} else {
						sendResult = false;
					}
				} else {
					confirmCallback(msg, { id: this.id, name: this.label });
					sendResult = true;
				}
			}
		} catch (error) {
			this.logger.warn(
				`Webhook destination ${this.label} failed to send message to: ${this.url} - ${
					(error as Error).message
				}`,
			);
		}

		return sendResult;
	}
}
