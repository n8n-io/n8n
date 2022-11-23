import { v4 as uuid } from 'uuid';
import { LoggerProxy } from 'n8n-workflow';
import { Db } from '../..';
import { AbstractEventMessage } from '../EventMessageClasses/AbstractEventMessage';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventBus } from '..';
import { DeleteResult, InsertResult } from 'typeorm';
import { EventMessageLevel } from '../EventMessageClasses/Enums';
import { MessageEventBusDestinationTypeNames } from '.';

export interface MessageEventBusDestinationOptions {
	__type?: string;
	id?: string;

	label?: string;
	enabled?: boolean;
	subscribedEvents?: string[];
	subscribedLevels?: EventMessageLevel[];
}

export abstract class MessageEventBusDestination {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static abstract deserialize(): MessageEventBusDestination | null;
	readonly id: string;

	__type: string;

	label: string;

	enabled: boolean;

	subscribedEvents: string[];

	subscribedLevels: EventMessageLevel[];

	constructor(options: MessageEventBusDestinationOptions) {
		this.id = options.id ?? uuid();
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.abstract;
		this.label = options.label ?? 'Log Destination';
		this.enabled = options.enabled ?? false;
		this.subscribedEvents = options.subscribedEvents ?? [];
		this.subscribedLevels = options.subscribedLevels ?? [
			EventMessageLevel.log,
			EventMessageLevel.error,
			EventMessageLevel.warn,
			EventMessageLevel.info,
		];
		LoggerProxy.debug(`${this.__type}(${this.id}) event destination initialized`);
	}

	startListening() {
		if (this.enabled) {
			eventBus.on(this.getId(), async (msg: EventMessageTypes) => {
				await this.receiveFromEventBus(msg);
			});
			LoggerProxy.debug(`${this.id} listener started`);
		}
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	stopListening() {
		eventBus.removeAllListeners(this.getId());
	}

	getId() {
		return this.id;
	}

	hasSubscribedToEvent(msg: AbstractEventMessage) {
		if (!this.enabled) return false;
		if (this.subscribedLevels.includes(msg.level)) {
			for (const eventName of this.subscribedEvents) {
				if (eventName === '*' || msg.eventName.startsWith(eventName)) {
					return true;
				}
			}
		}
		return false;
	}

	async saveToDb() {
		const data = {
			id: this.getId(),
			destination: this.serialize(),
		};
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		const dbResult: InsertResult = await Db.collections.EventDestinations.upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		return dbResult;
	}

	async deleteFromDb() {
		return MessageEventBusDestination.deleteFromDb(this.getId());
	}

	static async deleteFromDb(id: string): Promise<DeleteResult> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const dbResult = await Db.collections.EventDestinations.delete({ id });
		return dbResult as DeleteResult;
	}

	serialize(): MessageEventBusDestinationOptions {
		return {
			__type: this.__type,
			id: this.getId(),
			label: this.label,
			enabled: this.enabled,
			subscribedEvents: this.subscribedEvents,
			subscribedLevels: this.subscribedLevels,
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
