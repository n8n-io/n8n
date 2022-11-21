import { v4 as uuid } from 'uuid';
import { JsonValue, LoggerProxy } from 'n8n-workflow';
import { Db } from '../..';
import { AbstractEventMessage } from '../EventMessageClasses/AbstractEventMessage';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventBus } from '..';
import { DeleteResult, InsertResult } from 'typeorm';
import { EventMessageLevel } from '../EventMessageClasses/Enums';
// import { MessageEventBusDestinationTypeNames } from '.';

export interface MessageEventBusDestinationOptions {
	id?: string;
	enabled?: boolean;
	name?: string;
	subscribedEvents?: string[];
	subscribedLevels?: EventMessageLevel[];
}

export abstract class MessageEventBusDestination {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static readonly __type: string;
	// static abstract deserialize(): MessageEventBusDestination | null;

	readonly id: string;

	enabled: boolean;

	name: string;

	// subscriptionSet: EventMessageSubscriptionSet;
	subscribedEvents: string[];

	subscribedLevels: EventMessageLevel[];

	constructor(options: MessageEventBusDestinationOptions) {
		this.id = options.id ?? uuid();
		this.enabled = options.enabled ?? true;
		this.name = options.name ?? 'MessageEventBusDestination';
		this.subscribedEvents = options.subscribedEvents ?? ['*'];
		this.subscribedLevels = options.subscribedLevels ?? [EventMessageLevel.allLevels];
		LoggerProxy.debug(`${this.name} event destination initialized`);
	}

	startListening() {
		if (this.enabled) {
			eventBus.on(this.getName(), async (msg: EventMessageTypes) => {
				await this.receiveFromEventBus(msg);
				LoggerProxy.debug(`${this.name} listener started`);
			});
		}
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	stopListening() {
		eventBus.removeAllListeners(this.getName());
	}

	getName() {
		return this.name;
	}

	getId() {
		return this.id;
	}

	hasSubscribedToEvent(msg: AbstractEventMessage) {
		if (!this.enabled) return false;
		if (
			this.subscribedLevels.includes(EventMessageLevel.allLevels) ||
			this.subscribedLevels.includes(msg.level)
		) {
			for (const eventName of this.subscribedEvents) {
				if (eventName === '*' || eventName.startsWith(msg.eventName)) {
					return true;
				}
			}
		}
		return false;
	}

	async saveToDb() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		const dbResult: InsertResult = await Db.collections.EventDestinations.upsert(
			{
				id: this.getId(),
				name: this.getName(),
				destination: this.toString(),
			},
			{
				skipUpdateIfNoValuesChanged: true,
				conflictPaths: ['id'],
			},
		);
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

	serialize(): { __type: string; [key: string]: JsonValue } {
		return {
			__type: '$$AbstractMessageEventBusDestination',
			id: this.getId(),
			enabled: this.enabled,
			name: this.getName(),
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
