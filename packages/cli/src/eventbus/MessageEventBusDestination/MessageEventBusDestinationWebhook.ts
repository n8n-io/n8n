import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from './MessageEventBusDestination';
import axios from 'axios';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageTypes } from '../EventMessageClasses';
import { MessageEventBusDestinationTypeNames } from '.';

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
	queryParameterArrays?: string;
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
}

export interface MessageEventBusDestinationWebhookOptions
	extends MessageEventBusDestinationOptions {
	url: string;
	responseCodeMustMatch?: boolean;
	expectedStatusCode?: number;
	method?: string;
	authentication?: string;
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
	proxy?: string;
	timeout?: number;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
	__type: string = MessageEventBusDestinationTypeNames.webhook;

	url: string;

	responseCodeMustMatch = false;

	expectedStatusCode = 200;

	method = 'POST';

	authentication = 'none';

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

	proxy = '';

	timeout = 10000;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super(options);
		this.url = options.url;
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
		if (options.proxy) this.proxy = options.proxy;
		if (options.timeout) this.timeout = options.timeout;
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		console.log('URL', this.url);
		try {
			if (this.responseCodeMustMatch) {
				const postResult = await axios.post(this.url, msg);
				if (postResult.status === this.expectedStatusCode) {
					await eventBus.confirmSent(msg);
				}
			} else {
				await axios.post(this.url, msg);
				await eventBus.confirmSent(msg);
			}
			return true;
		} catch (error) {
			console.log(error.message);
		}
		return false;
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
			proxy: this.proxy,
			timeout: this.timeout,
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
}
