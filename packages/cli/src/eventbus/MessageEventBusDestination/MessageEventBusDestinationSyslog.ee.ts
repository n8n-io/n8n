/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import syslog from 'syslog-client';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import {
	LoggerProxy,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import { isLogStreamingEnabled } from '../MessageEventBus/MessageEventBusHelper';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventMessageGenericDestinationTestEvent } from '../EventMessageClasses/EventMessageGeneric';

export const isMessageEventBusDestinationSyslogOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSyslogOptions => {
	const o = candidate as MessageEventBusDestinationSyslogOptions;
	if (!o) return false;
	return o.host !== undefined;
};

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
		LoggerProxy.debug(`MessageEventBusDestinationSyslog with id ${this.getId()} initialized`);
		this.client.on('error', function (error) {
			console.error(error);
		});
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		let sendResult = false;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const serializedMessage = msg.serialize();
			if (this.anonymizeAuditMessages) {
				serializedMessage.payload = msg.anonymize();
			}
			delete serializedMessage.__type;
			this.client.log(
				JSON.stringify(serializedMessage),
				{
					severity: msg.eventName.toLowerCase().endsWith('error')
						? syslog.Severity.Error
						: syslog.Severity.Debug,
					msgid: msg.id,
					timestamp: msg.ts.toJSDate(),
				},
				async (error) => {
					if (error) {
						console.log(error);
					} else {
						await eventBus.confirmSent(msg, { id: this.id, name: this.label });
						sendResult = true;
					}
				},
			);
		} catch (error) {
			console.log(error);
		}
		if (msg.eventName === eventMessageGenericDestinationTestEvent) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		return sendResult;
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
