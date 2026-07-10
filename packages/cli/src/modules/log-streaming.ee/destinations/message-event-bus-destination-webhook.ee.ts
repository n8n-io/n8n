/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { OutboundHttp } from '@n8n/backend-network';
import {
	LOGSTREAMING_DEFAULT_MAX_FREE_SOCKETS,
	LOGSTREAMING_DEFAULT_MAX_SOCKETS,
	LOGSTREAMING_DEFAULT_MAX_TOTAL_SOCKETS,
	LOGSTREAMING_DEFAULT_SOCKET_TIMEOUT_MS,
} from '@n8n/constants';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy } from 'n8n-core';
import { jsonParse, MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationWebhookParameterItem,
	MessageEventBusDestinationWebhookParameterOptions,
	IWorkflowExecuteAdditionalData,
	MessageEventBusDestinationWebhookOptions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import type {
	MessageEventBus,
	MessageWithCallback,
} from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestination } from './message-event-bus-destination.ee';

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

	requestOptions?: IHttpRequestOptions;

	constructor(
		eventBusInstance: MessageEventBus,
		options: MessageEventBusDestinationWebhookOptions,
		private readonly outboundHttp: OutboundHttp,
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

	/**
	 * The frontend fixedCollection uses the same name for the collection and its single
	 * option, producing nested shapes like options.redirect = { redirect: { ... } }.
	 * Older DB entries may store the flat (unwrapped) shape instead, so handle both.
	 */
	private resolveRedirect(options: MessageEventBusDestinationWebhookParameterOptions | undefined) {
		const redirect = options?.redirect;
		return redirect && 'redirect' in redirect ? redirect.redirect : redirect;
	}

	/**
	 * The request proxy is a flat { protocol, host, port }, so unwrap the nested
	 * fixedCollection shape options.proxy = { proxy: { ... } } when present.
	 */
	private resolveProxy(options: MessageEventBusDestinationWebhookParameterOptions | undefined) {
		const proxyOpt = options?.proxy;
		return proxyOpt && 'proxy' in proxyOpt ? proxyOpt.proxy : proxyOpt;
	}

	private buildAgentOptions(
		options: MessageEventBusDestinationWebhookParameterOptions | undefined,
	): IHttpRequestOptions['agentOptions'] {
		return {
			// keepAlive to keep TCP connections alive for reuse
			keepAlive: options?.socket?.keepAlive ?? true,
			maxSockets: options?.socket?.maxSockets ?? LOGSTREAMING_DEFAULT_MAX_SOCKETS,
			maxFreeSockets: options?.socket?.maxFreeSockets ?? LOGSTREAMING_DEFAULT_MAX_FREE_SOCKETS,
			maxTotalSockets: options?.socket?.maxSockets ?? LOGSTREAMING_DEFAULT_MAX_TOTAL_SOCKETS,
		};
	}

	private buildConnectionOptions(): IHttpRequestOptions {
		const requestOptions: IHttpRequestOptions = {
			url: this.url,
			method: this.method as IHttpRequestMethods,
			headers: {},
			disableFollowRedirect: true,
			agentOptions: this.buildAgentOptions(this.options),
			timeout: this.options?.timeout ?? LOGSTREAMING_DEFAULT_SOCKET_TIMEOUT_MS,
		};

		const redirectInner = this.resolveRedirect(this.options);
		if (redirectInner?.followRedirects) {
			requestOptions.disableFollowRedirect = false;
			requestOptions.maxRedirects = redirectInner.maxRedirects;
		}

		const proxy = this.resolveProxy(this.options);
		if (proxy) {
			requestOptions.proxy = proxy;
		}

		if (this.options?.allowUnauthorizedCerts) {
			requestOptions.skipSslCertificateValidation = true;
		}

		return requestOptions;
	}

	async matchDecryptedCredentialType(credentialType: string) {
		const foundCredential = Object.entries(this.credentials).find((e) => e[0] === credentialType);
		if (foundCredential) {
			const credentialsDecrypted = await this.credentialsHelper?.getDecrypted(
				{
					externalSecretsProxy: Container.get(ExternalSecretsProxy),
				} as unknown as IWorkflowExecuteAdditionalData,
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

	async generateRequestOptions() {
		if (this.requestOptions) {
			return;
		}

		const requestOptions = this.buildConnectionOptions();

		this.credentialsHelper ??= Container.get(CredentialsHelper);

		const sendQuery = this.sendQuery;
		const specifyQuery = this.specifyQuery;
		const sendHeaders = this.sendHeaders;
		const specifyHeaders = this.specifyHeaders;

		if (this.sendQuery && this.options?.queryParameterArrays) {
			requestOptions.arrayFormat = this.options.queryParameterArrays;
		}

		const parametersToKeyValue = async (
			acc: Promise<{ [key: string]: any }>,
			cur: {
				name: string;
				value: string | number | boolean | null;
				parameterType?: string;
				inputDataFieldName?: string;
			},
		) => {
			const accumulator = await acc;
			accumulator[cur.name] = cur.value;
			return accumulator;
		};

		// Get parameters defined in the UI
		if (sendQuery && this.queryParameters.parameters) {
			if (specifyQuery === 'keypair') {
				requestOptions.qs = await this.queryParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyQuery === 'json') {
				// query is specified using JSON
				try {
					JSON.parse(this.jsonQuery);
				} catch {
					this.logger.error('JSON parameter needs to be valid JSON');
				}
				requestOptions.qs = jsonParse(this.jsonQuery);
			}
		}

		// Get parameters defined in the UI
		if (sendHeaders && this.headerParameters.parameters) {
			if (specifyHeaders === 'keypair') {
				requestOptions.headers = await this.headerParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyHeaders === 'json') {
				// body is specified using JSON
				try {
					JSON.parse(this.jsonHeaders);
				} catch {
					this.logger.error('JSON parameter needs to be valid JSON');
				}
				requestOptions.headers = jsonParse(this.jsonHeaders);
			}
		}

		// default for bodyContentType.raw
		if (requestOptions.headers === undefined) {
			requestOptions.headers = {};
		}
		requestOptions.headers['Content-Type'] = 'application/json';

		this.requestOptions = requestOptions;
	}

	serialize(): MessageEventBusDestinationWebhookOptions {
		const abstractSerialized = super.serialize();
		// Re-nest proxy and redirect if stored flat in DB by a previous version
		// that used Zod .transform() to unwrap the fixedCollection nesting on save.
		const options = { ...this.options };
		if (options.proxy && !('proxy' in options.proxy)) {
			options.proxy = { proxy: options.proxy };
		}
		if (options.redirect && !('redirect' in options.redirect)) {
			options.redirect = { redirect: options.redirect };
		}
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
			options,
			credentials: this.credentials,
		};
	}

	static deserialize(
		eventBusInstance: MessageEventBus,
		data: MessageEventBusDestinationOptions,
		outboundHttp: OutboundHttp,
	): MessageEventBusDestinationWebhook | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.webhook &&
			isMessageEventBusDestinationWebhookOptions(data)
		) {
			return new MessageEventBusDestinationWebhook(eventBusInstance, data, outboundHttp);
		}
		return null;
	}

	// eslint-disable-next-line complexity
	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;

		// at first run, build this.requestOptions with the destination settings
		await this.generateRequestOptions();

		// we need to make a copy of the request here, because to access the credentials
		// later on we are awaiting and therefore yielding to the event loop
		// therefore a race condition can occur for multiple events being processed simultaneously
		const request: IHttpRequestOptions & { returnFullResponse: true } = {
			...(this.requestOptions ?? { url: this.url }),
			returnFullResponse: true,
		};

		const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;

		if (['PATCH', 'POST', 'PUT', 'GET'].includes(this.method.toUpperCase())) {
			request.json = true;
			if (this.sendPayload) {
				request.body = {
					...msg,
					__type: undefined,
					payload,
					ts: msg.ts.toISO(),
				};
			} else {
				request.body = {
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
			request.auth = {
				username: httpBasicAuth.user as string,
				password: httpBasicAuth.password as string,
			};
		} else if (httpHeaderAuth) {
			request.headers = {
				...request.headers,
				[httpHeaderAuth.name as string]: httpHeaderAuth.value as string,
			};
		} else if (httpQueryAuth) {
			request.qs = {
				...request.qs,
				[httpQueryAuth.name as string]: httpQueryAuth.value as string,
			};
		} else if (httpDigestAuth) {
			request.auth = {
				username: httpDigestAuth.user as string,
				password: httpDigestAuth.password as string,
			};
		}

		try {
			const requestResponse = await this.outboundHttp
				.requests({ ssrf: 'disabled' }) // The destination URL is admin-configured, so SSRF protection is disabled.
				.request(request);
			if (requestResponse) {
				if (this.responseCodeMustMatch) {
					if (requestResponse.statusCode === this.expectedStatusCode) {
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
				`Webhook destination ${this.label} (${this.id}) failed to send message to: ${this.url} - ${
					(error as Error).message
				}`,
			);
			throw error;
		}

		return sendResult;
	}
}
