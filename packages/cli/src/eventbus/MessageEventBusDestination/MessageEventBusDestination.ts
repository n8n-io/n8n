import { v4 as uuid } from 'uuid';
import { JsonValue, LoggerProxy } from 'n8n-workflow';
import {
	EventMessageSubscriptionSet,
	EventMessageSubscriptionSetOptions,
} from './EventMessageSubscriptionSet';
import { Db } from '../..';
import { AbstractEventMessage } from '../EventMessageClasses/AbstractEventMessage';
import { EventMessageLevel, EventMessageTypes } from '../EventMessageClasses';
import { eventBus } from '..';

export interface MessageEventBusDestinationOptions {
	id?: string;
	name?: string;
	subscriptionSet?: EventMessageSubscriptionSet;
}

export abstract class MessageEventBusDestination {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static readonly __type: string;
	// static deserialize(): MessageEventBusDestination;
	// static fromString(data: string): MessageEventBusDestination;

	readonly id: string;

	name: string;

	subscriptionSet: EventMessageSubscriptionSet;

	constructor(options: MessageEventBusDestinationOptions) {
		this.id = options.id ?? uuid();
		this.name = options.name ?? 'MessageEventBusDestination';
		this.subscriptionSet = options.subscriptionSet
			? new EventMessageSubscriptionSet(options.subscriptionSet)
			: new EventMessageSubscriptionSet();
		eventBus.on(this.getName(), async (msg: EventMessageTypes) => {
			await this.receiveFromEventBus(msg);
		});
		LoggerProxy.debug(`${this.name} event destination initialized`);
	}

	getName() {
		return this.name;
	}

	getId() {
		return this.id;
	}

	setSubscription(subscriptionSetOptions: EventMessageSubscriptionSetOptions) {
		this.subscriptionSet = EventMessageSubscriptionSet.deserialize(subscriptionSetOptions);
	}

	setEventGroups(groups: string[]) {
		this.subscriptionSet.setEventGroups(groups);
	}

	setEventNames(names: string[]) {
		this.subscriptionSet.setEventNames(names);
	}

	setLevels(levels: EventMessageLevel[]) {
		this.subscriptionSet.setEventLevels(levels);
	}

	hasSubscribedToEvent(msg: AbstractEventMessage) {
		const eventGroup = msg.getEventGroup();

		if (
			this.subscriptionSet.eventLevels.includes(EventMessageLevel.allLevels) ||
			this.subscriptionSet.eventLevels.includes(msg.level)
		) {
			if (
				this.subscriptionSet.eventGroups.includes('*') ||
				this.subscriptionSet.eventNames.includes('*') ||
				(eventGroup !== undefined && this.subscriptionSet.eventGroups.includes(eventGroup)) ||
				this.subscriptionSet.eventNames.includes(msg.eventName)
			) {
				return true;
			}
		}
		return false;
	}

	async saveToDb() {
		const dbResult = await Db.collections.EventDestinations.upsert(
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

	static async deleteFromDb(id: string) {
		const dbResult = await Db.collections.EventDestinations.delete({ id });
		return dbResult;
	}

	abstract serialize(): JsonValue;

	abstract receiveFromEventBus(msg: AbstractEventMessage): Promise<boolean>;

	toString() {
		return JSON.stringify(this.serialize());
	}

	close(): void | Promise<void> {
		eventBus.removeAllListeners(this.getName());
	}
}
