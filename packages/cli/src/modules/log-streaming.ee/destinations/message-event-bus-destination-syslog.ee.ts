/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { SyslogClient } from '@n8n/syslog-client';
import { createClient, Facility, Transport, Severity } from '@n8n/syslog-client';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSyslogOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { eventMessageGenericDestinationTestEvent } from '@/eventbus/event-message-classes/event-message-generic';
import type {
	MessageEventBus,
	MessageWithCallback,
} from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestination } from './message-event-bus-destination.ee';
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
	client: SyslogClient;

	expectedStatusCode?: number;

	host: string;

	port: number;

	protocol: 'udp' | 'tcp' | 'tls';

	facility: Facility;

	app_name: string;

	eol: string;

	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationSyslogOptions) {
		super(eventBusInstance, options);
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.syslog;
		this.label = options.label ?? 'Syslog Server';

		this.host = options.host ?? 'localhost';
		this.port = options.port ?? 514;
		this.protocol = options.protocol ?? 'udp';
		this.facility = options.facility ?? Facility.Local0;
		this.app_name = options.app_name ?? 'n8n';
		this.eol = options.eol ?? '\n';
		this.expectedStatusCode = options.expectedStatusCode ?? 200;

		if (this.protocol === 'tls' && !options.tlsCa) {
			this.logger.error('Syslog - No TLS CA set - Unable to create the syslog client');
		}

		this.client = createClient(this.host, {
			appName: this.app_name,
			facility: Facility.Local0,
			// severity: syslog.Severity.Error,
			port: this.port,
			rfc3164: false,
			tlsCA: options.tlsCa,
			transport:
				this.protocol === 'tcp'
					? Transport.Tcp
					: this.protocol === 'tls'
						? Transport.Tls
						: Transport.Udp,
		});
		this.logger.debug(`MessageEventBusDestinationSyslog with id ${this.getId()} initialized`);
		this.client.on('error', function (error) {
			Container.get(Logger).error(`${error.message}`);
		});
	}

	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const serializedMessage = msg.serialize();
			if (this.anonymizeAuditMessages) {
				serializedMessage.payload = msg.anonymize();
			}
			delete serializedMessage.__type;
			await this.client.log(
				JSON.stringify(serializedMessage),
				{
					severity: msg.eventName.toLowerCase().endsWith('error') ? Severity.Error : Severity.Debug,
					msgid: msg.id,
					timestamp: msg.ts.toJSDate(),
				},
				async (error) => {
					if (error?.message) {
						this.logger.error(error.message);
					} else {
						// eventBus.confirmSent(msg, { id: this.id, name: this.label });
						confirmCallback(msg, { id: this.id, name: this.label });
						sendResult = true;
					}
				},
			);
		} catch (error) {
			if (error.message) this.logger.error(error.message as string);
			throw error;
		}
		if (msg.eventName === eventMessageGenericDestinationTestEvent) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		return sendResult;
	}

	serialize(): MessageEventBusDestinationSyslogOptions {
		const abstractSerialized = super.serialize();
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
		eventBusInstance: MessageEventBus,
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationSyslog | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.syslog &&
			isMessageEventBusDestinationSyslogOptions(data)
		) {
			return new MessageEventBusDestinationSyslog(eventBusInstance, data);
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
