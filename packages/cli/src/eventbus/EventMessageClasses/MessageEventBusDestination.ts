import remove from 'lodash.remove';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessage } from './EventMessage';
import { v4 as uuid } from 'uuid';
import { JsonValue } from 'n8n-workflow';

interface MessageEventBusDestinationOptions {
	name: string;
	subscriptionSetIds?: string[];
}

export abstract class MessageEventBusDestination {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static readonly type: string;
	// static deserialize(): MessageEventBusDestination;
	// static fromString(data: string): MessageEventBusDestination;

	readonly #id: string;

	name: string;

	subscriptionSetIds: string[];

	constructor(options: MessageEventBusDestinationOptions) {
		this.#id = uuid();
		this.name = options.name;
		this.subscriptionSetIds = options.subscriptionSetIds ?? [];
	}

	getName() {
		return this.name;
	}

	getId() {
		return this.#id;
	}

	addSubscription(subscriptionSetIds: string) {
		if (!this.subscriptionSetIds.includes(subscriptionSetIds)) {
			this.subscriptionSetIds.push(subscriptionSetIds);
		}
	}

	removeSubscription(subscriptionSetIds: string) {
		if (this.subscriptionSetIds.includes(subscriptionSetIds)) {
			remove(this.subscriptionSetIds, (e) => e === subscriptionSetIds);
		}
	}

	hasSubscribedToEvent(msg: EventMessage) {
		if (this.subscriptionSetIds.length === 0) return false;

		const eventGroup = msg.getEventGroup();

		for (const subscriptionSetId of this.subscriptionSetIds) {
			const subscriptionSet = eventBus.getSubscriptionSet(subscriptionSetId);
			if (subscriptionSet) {
				if (subscriptionSet.eventLevels.includes(msg.level)) {
					if (
						subscriptionSet.eventGroups.includes('*') ||
						subscriptionSet.eventNames.includes('*') ||
						(eventGroup !== undefined && subscriptionSet.eventGroups.includes(eventGroup)) ||
						subscriptionSet.eventNames.includes(msg.eventName)
					) {
						return true;
					}
				}
			}
		}
		return false;
	}

	abstract serialize(): JsonValue;

	abstract toString(): string;

	abstract receiveFromEventBus(msg: EventMessage): Promise<boolean>;

	abstract close(): Promise<void>;
}
