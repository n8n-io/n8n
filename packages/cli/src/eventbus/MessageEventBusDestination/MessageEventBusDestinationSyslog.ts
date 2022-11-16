/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EventMessage } from '../EventMessageClasses/EventMessage';
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from '../EventMessageClasses/MessageEventBusDestination';
import syslog from 'syslog-client';
import { EventMessageLevel } from '../types/EventMessageTypes';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { JsonObject, jsonParse, JsonValue } from 'n8n-workflow';

export const isMessageEventBusDestinationSyslogOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSyslogOptions => {
	const o = candidate as MessageEventBusDestinationSyslogOptions;
	if (!o) return false;
	return o.host !== undefined;
};

export interface MessageEventBusDestinationSyslogOptions extends MessageEventBusDestinationOptions {
	expectedStatusCode?: number;
	host: string;
	port?: number;
	protocol?: 'udp' | 'tcp';
	facility?: syslog.Facility;
	app_name?: string;
	eol?: string;
}

function eventMessageLevelToSyslogSeverity(emLevel: EventMessageLevel) {
	switch (emLevel) {
		case 'debug':
			return syslog.Severity.Debug;
		case 'info':
			return syslog.Severity.Informational;
		case 'notice':
			return syslog.Severity.Notice;
		case 'warning':
			return syslog.Severity.Warning;
		case 'error':
			return syslog.Severity.Error;
		case 'crit':
			return syslog.Severity.Critical;
		case 'alert':
			return syslog.Severity.Alert;
		case 'emerg':
			return syslog.Severity.Emergency;
		default:
			return syslog.Severity.Informational;
	}
}

export class MessageEventBusDestinationSyslog extends MessageEventBusDestination {
	static readonly __type = '$$MessageEventBusDestinationSyslog';

	client: syslog.Client;

	sysLogOptions: MessageEventBusDestinationSyslogOptions;

	constructor(options: MessageEventBusDestinationSyslogOptions) {
		super(options);

		this.sysLogOptions = {
			host: options.host ?? 'localhost',
			port: options.port ?? 514,
			protocol: options.protocol ?? 'udp',
			facility: options.facility ?? syslog.Facility.Local0,
			app_name: options.app_name ?? 'n8n',
			eol: options.eol ?? '\n',
			expectedStatusCode: options.expectedStatusCode ?? 200,
		};

		this.client = syslog.createClient(this.sysLogOptions.host, {
			appName: this.sysLogOptions.app_name,
			facility: syslog.Facility.Local0,
			severity: syslog.Severity.Error,
			port: this.sysLogOptions.port,
			transport:
				options.protocol !== undefined && options.protocol === 'tcp'
					? syslog.Transport.Tcp
					: syslog.Transport.Udp,
		});
		console.debug(
			`MessageEventBusDestinationSyslog ${this.getName()} with id ${this.getId()} initialized`,
		);
		this.client.on('error', function (error) {
			console.error(error);
		});
	}

	getConfig(): MessageEventBusDestinationSyslogOptions {
		return this.sysLogOptions;
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		if (!this.hasSubscribedToEvent(msg)) return false;
		try {
			this.client.log(
				msg.toString(),
				{
					severity: eventMessageLevelToSyslogSeverity(msg.level),
					msgid: msg.id,
					timestamp: msg.ts.toJSDate(),
				},
				async (error) => {
					if (error) {
						console.log(error);
						return false;
					} else {
						await eventBus.confirmSent(msg);
						return true;
					}
				},
			);
		} catch (error) {
			console.log(error);
		}
		return true;
	}

	serialize(): JsonValue {
		return {
			__type: MessageEventBusDestinationSyslog.__type,
			options: {
				id: this.getId(),
				name: this.getName(),
				expectedStatusCode: this.sysLogOptions.expectedStatusCode!,
				host: this.sysLogOptions.host,
				port: this.sysLogOptions.port!,
				protocol: this.sysLogOptions.protocol!,
				facility: this.sysLogOptions.facility!,
				app_name: this.sysLogOptions.app_name!,
				eol: this.sysLogOptions.eol!,
				subscriptionSet: this.subscriptionSet.serialize(),
			},
		};
	}

	static deserialize(data: JsonObject): MessageEventBusDestinationSyslog | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationSyslog.__type &&
			'options' in data &&
			isMessageEventBusDestinationSyslogOptions(data.options)
		) {
			return new MessageEventBusDestinationSyslog(data.options);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationSyslog | null {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationSyslog.deserialize(o);
	}

	async close() {
		this.client.close();
	}
}
