'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MessageEventBusDestinationWebhook = exports.isMessageEventBusDestinationWebhookOptions =
	void 0;
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const https_1 = require('https');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const credentials_helper_1 = require('@/credentials-helper');
const message_event_bus_destination_ee_1 = require('./message-event-bus-destination.ee');
const event_message_generic_1 = require('../event-message-classes/event-message-generic');
const isMessageEventBusDestinationWebhookOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.url !== undefined;
};
exports.isMessageEventBusDestinationWebhookOptions = isMessageEventBusDestinationWebhookOptions;
class MessageEventBusDestinationWebhook extends message_event_bus_destination_ee_1.MessageEventBusDestination {
	constructor(eventBusInstance, options) {
		super(eventBusInstance, options);
		this.responseCodeMustMatch = false;
		this.expectedStatusCode = 200;
		this.method = 'POST';
		this.authentication = 'none';
		this.sendQuery = false;
		this.sendHeaders = false;
		this.genericAuthType = '';
		this.nodeCredentialType = '';
		this.specifyHeaders = '';
		this.specifyQuery = '';
		this.jsonQuery = '';
		this.jsonHeaders = '';
		this.headerParameters = { parameters: [] };
		this.queryParameters = { parameters: [] };
		this.options = {};
		this.sendPayload = true;
		this.url = options.url;
		this.label = options.label ?? 'Webhook Endpoint';
		this.__type = options.__type ?? '$$MessageEventBusDestinationWebhook';
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
	async matchDecryptedCredentialType(credentialType) {
		const foundCredential = Object.entries(this.credentials).find((e) => e[0] === credentialType);
		if (foundCredential) {
			const credentialsDecrypted = await this.credentialsHelper?.getDecrypted(
				{
					externalSecretsProxy: di_1.Container.get(n8n_core_1.ExternalSecretsProxy),
				},
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
			method: this.method,
			url: this.url,
			maxRedirects: 0,
		};
		if (this.credentialsHelper === undefined) {
			this.credentialsHelper = di_1.Container.get(credentials_helper_1.CredentialsHelper);
		}
		const sendQuery = this.sendQuery;
		const specifyQuery = this.specifyQuery;
		const sendHeaders = this.sendHeaders;
		const specifyHeaders = this.specifyHeaders;
		if (this.options.allowUnauthorizedCerts) {
			this.axiosRequestOptions.httpsAgent = new https_1.Agent({ rejectUnauthorized: false });
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
		const parametersToKeyValue = async (acc, cur) => {
			const accumulator = await acc;
			accumulator[cur.name] = cur.value;
			return accumulator;
		};
		if (sendQuery && this.queryParameters.parameters) {
			if (specifyQuery === 'keypair') {
				this.axiosRequestOptions.params = this.queryParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyQuery === 'json') {
				try {
					JSON.parse(this.jsonQuery);
				} catch {
					this.logger.error('JSON parameter needs to be valid JSON');
				}
				this.axiosRequestOptions.params = (0, n8n_workflow_1.jsonParse)(this.jsonQuery);
			}
		}
		if (sendHeaders && this.headerParameters.parameters) {
			if (specifyHeaders === 'keypair') {
				this.axiosRequestOptions.headers = await this.headerParameters.parameters.reduce(
					parametersToKeyValue,
					Promise.resolve({}),
				);
			} else if (specifyHeaders === 'json') {
				try {
					JSON.parse(this.jsonHeaders);
				} catch {
					this.logger.error('JSON parameter needs to be valid JSON');
				}
				this.axiosRequestOptions.headers = (0, n8n_workflow_1.jsonParse)(this.jsonHeaders);
			}
		}
		if (this.axiosRequestOptions.headers === undefined) {
			this.axiosRequestOptions.headers = {};
		}
		this.axiosRequestOptions.headers['Content-Type'] = 'application/json';
	}
	serialize() {
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
	static deserialize(eventBusInstance, data) {
		if (
			'__type' in data &&
			data.__type === '$$MessageEventBusDestinationWebhook' &&
			(0, exports.isMessageEventBusDestinationWebhookOptions)(data)
		) {
			return new MessageEventBusDestinationWebhook(eventBusInstance, data);
		}
		return null;
	}
	async receiveFromEventBus(emitterPayload) {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;
		if (msg.eventName !== event_message_generic_1.eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
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
			this.axiosRequestOptions.auth = {
				username: httpBasicAuth.user,
				password: httpBasicAuth.password,
			};
		} else if (httpHeaderAuth) {
			this.axiosRequestOptions.headers = {
				...this.axiosRequestOptions.headers,
				[httpHeaderAuth.name]: httpHeaderAuth.value,
			};
		} else if (httpQueryAuth) {
			this.axiosRequestOptions.params = {
				...this.axiosRequestOptions.params,
				[httpQueryAuth.name]: httpQueryAuth.value,
			};
		} else if (httpDigestAuth) {
			this.axiosRequestOptions.auth = {
				username: httpDigestAuth.user,
				password: httpDigestAuth.password,
			};
		}
		try {
			const requestResponse = await axios_1.default.request(this.axiosRequestOptions);
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
				`Webhook destination ${this.label} failed to send message to: ${this.url} - ${error.message}`,
			);
		}
		return sendResult;
	}
}
exports.MessageEventBusDestinationWebhook = MessageEventBusDestinationWebhook;
//# sourceMappingURL=message-event-bus-destination-webhook.ee.js.map
