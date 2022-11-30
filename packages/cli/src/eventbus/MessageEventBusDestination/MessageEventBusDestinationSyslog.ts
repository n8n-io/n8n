/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import syslog from 'syslog-client';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationTypeNames,
	EventMessageLevel,
} from 'n8n-workflow';
import { MessageEventBusDestination } from './MessageEventBusDestination';

export const isMessageEventBusDestinationSyslogOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSyslogOptions => {
	const o = candidate as MessageEventBusDestinationSyslogOptions;
	if (!o) return false;
	return o.host !== undefined;
};

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

export class MessageEventBusDestinationSyslog
	extends MessageEventBusDestination
	implements MessageEventBusDestinationSyslogOptions
{
	client: syslog.Client;

	expectedStatusCode?: number;

	host: string;

	port: number;

	protocol: 'udp' | 'tcp';

	facility: syslog.Facility;

	app_name: string;

	eol: string;

	anonymizeMessages?: boolean;

	constructor(options: MessageEventBusDestinationSyslogOptions) {
		super(options);
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.syslog;
		this.label = options.label ?? 'Syslog Server';

		this.host = options.host ?? 'localhost';
		this.port = options.port ?? 514;
		this.protocol = options.protocol ?? 'udp';
		this.facility = options.facility ?? syslog.Facility.Local0;
		this.app_name = options.app_name ?? 'n8n';
		this.eol = options.eol ?? '\n';
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		if (options.anonymizeMessages) this.anonymizeMessages = options.anonymizeMessages;

		this.client = syslog.createClient(this.host, {
			appName: this.app_name,
			facility: syslog.Facility.Local0,
			// severity: syslog.Severity.Error,
			port: this.port,
			transport:
				options.protocol !== undefined && options.protocol === 'tcp'
					? syslog.Transport.Tcp
					: syslog.Transport.Udp,
		});
		console.debug(`MessageEventBusDestinationSyslog with id ${this.getId()} initialized`);
		this.client.on('error', function (error) {
			console.error(error);
		});
	}

	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
		if (!this.hasSubscribedToEvent(msg)) return false;
		try {
			if (this.anonymizeMessages) {
				msg = msg.anonymize();
			}
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
						await eventBus.confirmSent(msg, { id: this.id, name: this.label });
						return true;
					}
				},
			);
		} catch (error) {
			console.log(error);
		}
		return true;
	}

	serialize(): MessageEventBusDestinationSyslogOptions {
		const abstractSerialized = super.serialize();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return {
			...abstractSerialized,
			expectedStatusCode: this.expectedStatusCode,
			host: this.host,
			port: this.port,
			protocol: this.protocol,
			facility: this.facility,
			app_name: this.app_name,
			eol: this.eol,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationSyslog | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.syslog &&
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
