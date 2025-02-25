/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Container } from '@n8n/di';
import { Logger } from 'n8n-core';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSyslogOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import syslog from 'syslog-client';

import { MessageEventBusDestination } from './message-event-bus-destination.ee';
import { eventMessageGenericDestinationTestEvent } from '../event-message-classes/event-message-generic';
import type { MessageEventBus, MessageWithCallback } from '../message-event-bus/message-event-bus';
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

	private reconnectAttempts = 0;

	private readonly maxReconnectAttempts = 5;

	private readonly reconnectDelay = 1000; // 1 second

	private isConnected = false;

	expectedStatusCode?: number;

	host: string;

	port: number;

	protocol: 'udp' | 'tcp';

	facility: syslog.Facility;

	app_name: string;

	eol: string;

	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationSyslogOptions) {
		super(eventBusInstance, options);
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.syslog;
		this.label = options.label ?? 'Syslog Server';

		this.host = options.host ?? 'localhost';
		this.port = options.port ?? 514;
		this.protocol = options.protocol ?? 'udp';
		this.facility = options.facility ?? syslog.Facility.Local0;
		this.app_name = options.app_name ?? 'n8n';
		this.eol = options.eol ?? '\n';
		this.expectedStatusCode = options.expectedStatusCode ?? 200;

		this.initializeClient();
	}

	private initializeClient() {
		this.client = syslog.createClient(this.host, {
			appName: this.app_name,
			facility: syslog.Facility.Local0,
			port: this.port,
			transport: this.protocol === 'tcp' ? syslog.Transport.Tcp : syslog.Transport.Udp,
		});

		this.client.on('error', async (error) => {
			this.isConnected = false;
			Container.get(Logger).error(`Syslog client error: ${error.message}`);
			await this.handleReconnect();
		});

		// For TCP connections, handle close events
		if (this.protocol === 'tcp') {
			this.client.on('close', async () => {
				this.isConnected = false;
				Container.get(Logger).warn('Syslog client connection closed');
				await this.handleReconnect();
			});
		}
	}

	private async handleReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			Container.get(Logger).error(
				`Failed to reconnect to syslog server after ${this.maxReconnectAttempts} attempts`,
			);
			return;
		}

		this.reconnectAttempts++;
		Container.get(Logger).debug(
			`Attempting to reconnect to syslog server (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
		);

		try {
			// Close existing client if it exists
			this.client.close();

			// Wait before reconnecting
			await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

			// Initialize new client
			this.initializeClient();

			this.isConnected = true;
			this.reconnectAttempts = 0;
			Container.get(Logger).debug('Successfully reconnected to syslog server');
		} catch (error) {
			Container.get(Logger).error(`Failed to reconnect to syslog server: ${error.message}`);
			// Try to reconnect again if we haven't reached max attempts
			await this.handleReconnect();
		}
	}

	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		const sendResult = false;

		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}

		if (!this.isConnected) {
			this.logger.warn('Syslog client is not connected, message will be dropped');
			return sendResult;
		}

		return await new Promise((resolve) => {
			try {
				const serializedMessage = msg.serialize();
				if (this.anonymizeAuditMessages) {
					serializedMessage.payload = msg.anonymize();
				}
				delete serializedMessage.__type;

				// Add timeout handling
				const timeoutId = setTimeout(() => {
					this.logger.error('Syslog message send timeout');
					resolve(false);
				}, 5000); // 5 second timeout

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
						clearTimeout(timeoutId);

						if (error?.message) {
							this.logger.debug(error.message);
							resolve(false);
						} else {
							confirmCallback(msg, { id: this.id, name: this.label });
							resolve(true);
						}
					},
				);
			} catch (error) {
				if (error.message) this.logger.debug(error.message as string);
				resolve(false);
			}
		});
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
