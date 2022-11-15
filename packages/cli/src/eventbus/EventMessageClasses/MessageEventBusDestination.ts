import { EventMessage } from './EventMessage';
import { v4 as uuid } from 'uuid';
import { JsonValue } from 'n8n-workflow';
import { EventMessageSubscriptionSet } from './EventMessageSubscriptionSet';
import {
	EventMessageGroups,
	EventMessageNames,
	EventMessageLevel,
} from '../types/EventMessageTypes';
import { Db } from '../..';

export interface MessageEventBusDestinationOptions {
	id?: string;
	name?: string;
	subscriptionSet?: EventMessageSubscriptionSet;
}

export abstract class MessageEventBusDestination {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static readonly serializedName: string;
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
	}

	getName() {
		return this.name;
	}

	getId() {
		return this.id;
	}

	setSubscription(subscriptionSet: EventMessageSubscriptionSet) {
		this.subscriptionSet = subscriptionSet;
	}

	setEventGroups(groups: EventMessageGroups[]) {
		this.subscriptionSet.setEventGroups(groups);
	}

	setEventNames(names: EventMessageNames[]) {
		this.subscriptionSet.setEventNames(names);
	}

	setLevels(levels: EventMessageLevel[]) {
		this.subscriptionSet.setEventLevels(levels);
	}

	hasSubscribedToEvent(msg: EventMessage) {
		const eventGroup = msg.getEventGroup();

		if (
			this.subscriptionSet.eventLevels.includes('*') ||
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

	abstract toString(): string;

	abstract receiveFromEventBus(msg: EventMessage): Promise<boolean>;

	abstract close(): Promise<void>;
}
