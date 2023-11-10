import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { DeleteResult, InsertResult } from 'typeorm';
import type { INodeCredentials } from 'n8n-workflow';
import {
	MessageEventBusDestinationTypeNames,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import { Logger } from '@/Logger';
import type { AbstractEventMessage } from '../EventMessageClasses/AbstractEventMessage';
import type { EventMessageTypes } from '../EventMessageClasses';
import type { EventMessageConfirmSource } from '../EventMessageClasses/EventMessageConfirm';
import { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import type { MessageWithCallback } from '../MessageEventBus/MessageEventBus';
import { EventDestinationsRepository } from '@db/repositories/eventDestinations.repository';

export abstract class MessageEventBusDestination implements MessageEventBusDestinationOptions {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static abstract deserialize(): MessageEventBusDestination | null;
	readonly id: string;

	readonly eventBusInstance: MessageEventBus;

	protected readonly logger: Logger;

	__type: MessageEventBusDestinationTypeNames;

	label: string;

	enabled: boolean;

	subscribedEvents: string[];

	credentials: INodeCredentials = {};

	anonymizeAuditMessages: boolean;

	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationOptions) {
		this.logger = Container.get(Logger);
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
		const dbResult: InsertResult = await Container.get(EventDestinationsRepository).upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		return dbResult;
	}

	async deleteFromDb() {
		return MessageEventBusDestination.deleteFromDb(this.getId());
	}

	static async deleteFromDb(id: string): Promise<DeleteResult> {
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
