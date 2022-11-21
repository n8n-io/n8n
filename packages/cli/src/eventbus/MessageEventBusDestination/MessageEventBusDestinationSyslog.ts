/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from './MessageEventBusDestination';
import syslog from 'syslog-client';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { JsonObject, JsonValue } from 'n8n-workflow';
import { EventMessageLevel } from '../EventMessageClasses/Enums';
import { MessageEventBusDestinationTypeNames } from '.';

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
		case EventMessageLevel.log:
			return syslog.Severity.Debug;
		case EventMessageLevel.debug:
			return syslog.Severity.Debug;
		case EventMessageLevel.info:
			return syslog.Severity.Informational;
		case EventMessageLevel.error:
			return syslog.Severity.Error;
		case EventMessageLevel.verbose:
			return syslog.Severity.Debug;
		case EventMessageLevel.warn:
			return syslog.Severity.Warning;
		default:
			return syslog.Severity.Debug;
	}
}

export class MessageEventBusDestinationSyslog extends MessageEventBusDestination {
	static readonly __type = MessageEventBusDestinationTypeNames.syslog;

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
			// severity: syslog.Severity.Error,
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

	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
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

	serialize(): { __type: string; [key: string]: JsonValue } {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			__type: MessageEventBusDestinationSyslog.__type,
			expectedStatusCode: this.sysLogOptions.expectedStatusCode!,
			host: this.sysLogOptions.host,
			port: this.sysLogOptions.port!,
			protocol: this.sysLogOptions.protocol!,
			facility: this.sysLogOptions.facility!,
			app_name: this.sysLogOptions.app_name!,
			eol: this.sysLogOptions.eol!,
		};
	}

	// serialize(): JsonValue {
	// 	return {
	// 		__type: MessageEventBusDestinationSyslog.__type,
	// 		options: {
	// 			id: this.getId(),
	// 			name: this.getName(),
	// 			expectedStatusCode: this.sysLogOptions.expectedStatusCode!,
	// 			host: this.sysLogOptions.host,
	// 			port: this.sysLogOptions.port!,
	// 			protocol: this.sysLogOptions.protocol!,
	// 			facility: this.sysLogOptions.facility!,
	// 			app_name: this.sysLogOptions.app_name!,
	// 			eol: this.sysLogOptions.eol!,
	// 			subscriptionSet: this.subscriptionSet.serialize(),
	// 		},
	// 	};
	// }

	static deserialize(data: JsonObject): MessageEventBusDestinationSyslog | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationSyslog.__type &&
			isMessageEventBusDestinationSyslogOptions(data)
		) {
			return new MessageEventBusDestinationSyslog(data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	async close() {
		await super.close();
		this.client.close();
	}
}
