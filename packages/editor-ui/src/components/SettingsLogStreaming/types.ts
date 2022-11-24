import { NodeParameterValue } from 'n8n-workflow';
import {v4 as uuid} from 'uuid';

export enum EventMessageLevel {
	log = 'log',
	debug = 'debug',
	info = 'info',
	error = 'error',
	verbose = 'verbose',
	warn = 'warn',
}

export class MessageEventBusDestinationTypeNames {
	static abstract = '$$AbstractMessageEventBusDestination';
	static webhook = '$$MessageEventBusDestinationWebhook';
	static sentry = '$$MessageEventBusDestinationSentry';
	static redis = '$$MessageEventBusDestinationRedis';
	static syslog = '$$MessageEventBusDestinationSyslog';
}


export class AbstractMessageEventBusDestination {
	__type = '';
	id = '';
	label = 'Log Destination';
	enabled = false;
	subscribedEvents: string[] = [];
	subscribedLevels: string[] = [
		EventMessageLevel.log,
		EventMessageLevel.error,
		EventMessageLevel.warn,
		EventMessageLevel.info,
	];
	constructor(t: string = MessageEventBusDestinationTypeNames.abstract) {
		this.id = uuid();
		this.__type = t;
	}
}

export class MessageEventBusDestinationSyslog extends AbstractMessageEventBusDestination {
	label = 'Syslog Server';
	expectedStatusCode = 200;
	host = '127.0.0.1';
	port = 514;
	protocol = 'tcp';
	facility = 16;
	app_name = 'n8n';
	eol = '\n';
	constructor() {
		super(MessageEventBusDestinationTypeNames.syslog);
	}
}

export class MessageEventBusDestinationWebhook extends AbstractMessageEventBusDestination {
	label = 'Webhook Endpoint';
	expectedStatusCode = 200;
	responseCodeMustMatch = false;
	url = 'https://';
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
	headerParameters: {parameters: Array<{
		name: string;
		value: NodeParameterValue;
	}>} = { parameters: [] };
	queryParameters: {parameters: Array<{
		name: string;
		value: NodeParameterValue;
	}>} = { parameters: [] };
	sendPayload = true;
	options: {
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
		},
		proxy?: {
			protocol: 'https'|'http';
			host: string;
			port: number;
		};
		timeout?: number;
	} = {};
	constructor() {
		super(MessageEventBusDestinationTypeNames.webhook);
	}
}
