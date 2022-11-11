import remove from 'lodash.remove';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessage } from './EventMessage';

interface MessageEventBusDestinationOptions {
	name: string;
}
export abstract class MessageEventBusDestination {
	readonly #name: string;

	subscriptionSetNames: string[] = [];

	constructor(options: MessageEventBusDestinationOptions) {
		this.#name = options.name;
	}

	getName() {
		return this.#name;
	}

	addSubscription(subscriptionSetName: string) {
		if (!this.subscriptionSetNames.includes(subscriptionSetName)) {
			this.subscriptionSetNames.push(subscriptionSetName);
		}
	}

	removeSubscription(subscriptionSetName: string) {
		if (this.subscriptionSetNames.includes(subscriptionSetName)) {
			remove(this.subscriptionSetNames, (e) => e === subscriptionSetName);
		}
	}

	hasSubscribedToEvent(msg: EventMessage) {
		if (this.subscriptionSetNames.length === 0) return false;

		const eventGroup = msg.getEventGroup();
		const eventName = msg.eventName;

		for (const subscriptionSetName of this.subscriptionSetNames) {
			const subscriptionSet = eventBus.getSubscriptionSet(subscriptionSetName);
			if (subscriptionSet) {
				if (
					subscriptionSet.eventGroups.includes('*') ||
					subscriptionSet.eventNames.includes('*') ||
					(eventGroup !== undefined && subscriptionSet.eventGroups.includes(eventGroup)) ||
					subscriptionSet.eventNames.includes(eventName)
				) {
					return true;
				}
			}
		}
		return false;
	}

	abstract receiveFromEventBus(msg: EventMessage): Promise<boolean>;

	abstract close(): Promise<void>;
}
