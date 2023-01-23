import { v4 as uuid } from 'uuid';
import {
	INodeCredentials,
	LoggerProxy,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import * as Db from '@/Db';
import { AbstractEventMessage } from '../EventMessageClasses/AbstractEventMessage';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventBus } from '..';
import type { DeleteResult, InsertResult } from 'typeorm';

export abstract class MessageEventBusDestination implements MessageEventBusDestinationOptions {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static abstract deserialize(): MessageEventBusDestination | null;
	readonly id: string;

	__type: MessageEventBusDestinationTypeNames;

	label: string;

	enabled: boolean;

	subscribedEvents: string[];

	credentials: INodeCredentials = {};

	anonymizeAuditMessages: boolean;

	constructor(options: MessageEventBusDestinationOptions) {
		this.id = !options.id || options.id.length !== 36 ? uuid() : options.id;
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.abstract;
		this.label = options.label ?? 'Log Destination';
		this.enabled = options.enabled ?? false;
		this.subscribedEvents = options.subscribedEvents ?? [];
		this.anonymizeAuditMessages = options.anonymizeAuditMessages ?? false;
		if (options.credentials) this.credentials = options.credentials;
		LoggerProxy.debug(`${this.__type}(${this.id}) event destination constructed`);
	}

	startListening() {
		if (this.enabled) {
			eventBus.on(this.getId(), async (msg: EventMessageTypes) => {
				await this.receiveFromEventBus(msg);
			});
			LoggerProxy.debug(`${this.id} listener started`);
		}
	}

	stopListening() {
		eventBus.removeAllListeners(this.getId());
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
		const dbResult: InsertResult = await Db.collections.EventDestinations.upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		Db.collections.EventDestinations.createQueryBuilder().insert().into('something').onConflict('');
		return dbResult;
	}

	async deleteFromDb() {
		return MessageEventBusDestination.deleteFromDb(this.getId());
	}

	static async deleteFromDb(id: string): Promise<DeleteResult> {
		const dbResult = await Db.collections.EventDestinations.delete({ id });
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

	abstract receiveFromEventBus(msg: AbstractEventMessage): Promise<boolean>;

	toString() {
		return JSON.stringify(this.serialize());
	}

	close(): void | Promise<void> {
		this.stopListening();
	}
}
