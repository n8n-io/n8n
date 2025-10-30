import { Logger } from '@n8n/backend-common';
import { EventDestinationsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeCredentials, MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { License } from '@/license';

import type { EventMessageTypes } from '../event-message-classes';
import type { AbstractEventMessage } from '../event-message-classes/abstract-event-message';
import type { EventMessageConfirmSource } from '../event-message-classes/event-message-confirm';
import type { MessageEventBus, MessageWithCallback } from '../message-event-bus/message-event-bus';

export abstract class MessageEventBusDestination implements MessageEventBusDestinationOptions {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static abstract deserialize(): MessageEventBusDestination | null;
	readonly id: string;

	readonly eventBusInstance: MessageEventBus;

	protected readonly logger: Logger;

	protected readonly license: License;

	__type: MessageEventBusDestinationTypeNames;

	label: string;

	enabled: boolean;

	subscribedEvents: string[];

	credentials: INodeCredentials = {};

	anonymizeAuditMessages: boolean;

	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationOptions) {
		// @TODO: Use DI
		this.logger = Container.get(Logger);
		this.license = Container.get(License);

		this.eventBusInstance = eventBusInstance;
		this.id = !options.id || options.id.length !== 36 ? uuid() : options.id;
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.abstract;
		this.label = options.label ?? 'Log Destination';
		this.enabled = options.enabled ?? false;
		this.subscribedEvents = options.subscribedEvents ?? [];
		this.anonymizeAuditMessages = options.anonymizeAuditMessages ?? false;
		if (options.credentials) this.credentials = options.credentials;
		this.logger.debug(`${this.__type}(${this.id}) event destination constructed`);
	}

	startListening() {
		if (this.enabled) {
			this.eventBusInstance.on(
				this.getId(),
				async (
					msg: EventMessageTypes,
					confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void,
				) => {
					await this.receiveFromEventBus({ msg, confirmCallback });
				},
			);
			this.logger.debug(`${this.id} listener started`);
		}
	}

	stopListening() {
		this.eventBusInstance.removeAllListeners(this.getId());
	}

	enable() {
		this.enabled = true;
		this.startListening();
	}

	disable() {
		this.enabled = false;
		this.stopListening();
	}

	getId() {
		return this.id;
	}

	hasSubscribedToEvent(msg: AbstractEventMessage) {
		if (!this.enabled) return false;
		for (const eventName of this.subscribedEvents) {
			if (eventName === '*' || msg.eventName.startsWith(eventName)) {
				return true;
			}
		}
		return false;
	}

	async saveToDb() {
		const data = {
			id: this.getId(),
			destination: this.serialize(),
		};
		const dbResult = await Container.get(EventDestinationsRepository).upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		return dbResult;
	}

	async deleteFromDb() {
		return await MessageEventBusDestination.deleteFromDb(this.getId());
	}

	static async deleteFromDb(id: string) {
		const dbResult = await Container.get(EventDestinationsRepository).delete({ id });
		return dbResult;
	}

	serialize(): MessageEventBusDestinationOptions {
		return {
			__type: this.__type,
			id: this.getId(),
			label: this.label,
			enabled: this.enabled,
			subscribedEvents: this.subscribedEvents,
			anonymizeAuditMessages: this.anonymizeAuditMessages,
		};
	}

	abstract receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean>;

	toString() {
		return JSON.stringify(this.serialize());
	}

	close(): void | Promise<void> {
		this.stopListening();
	}
}
