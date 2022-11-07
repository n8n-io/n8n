import { EventMessage } from '../EventMessage/EventMessage';
import { EventMessageSubscriptionSet } from '../EventMessage/EventMessageSubscriptionSet';
import unionBy from 'lodash.unionby';
import iteratee from 'lodash.iteratee';
import remove from 'lodash.remove';
import { MessageEventSubscriptionReceiverInterface } from '../MessageEventSubscriptionReceiver/MessageEventSubscriptionReceiverInterface';

export class LocalEventBroker {
	#subscribers: {
		[key: string]: {
			receiver: MessageEventSubscriptionReceiverInterface;
			subscriptions: EventMessageSubscriptionSet[];
		};
	} = {};

	async addMessage(msg: EventMessage): Promise<{ subscribers: number; sent: number }> {
		console.debug(`LocalEventBroker Msg received ${msg.eventName} - ${msg.id}`);
		let subscriberCountProcessed = 0;
		let subscriberCountSent = 0;
		for (const receiverName of Object.keys(this.#subscribers)) {
			const worker = this.#getReceiverByName(receiverName)?.worker;
			if (worker) {
				let match = false;
				const eventGroup = msg.getEventGroup();
				const eventName = msg.eventName;
				const subscriptionSets = this.#getSubscriptionSetsByName(receiverName);
				if (subscriptionSets) {
					for (const subscriptionSet of subscriptionSets) {
						if (
							(eventGroup !== undefined && subscriptionSet.eventGroups.includes(eventGroup)) ||
							subscriptionSet.eventNames.includes(eventName)
						) {
							match = true;
							break;
						}
					}
				}
				if (match) {
					console.debug(`LocalEventBroker Msg sent to subscriber ${msg.eventName} - ${msg.id}`);
					await this.#getReceiverByName(receiverName)?.receive(msg);
					subscriberCountSent++;
				}
			}
			subscriberCountProcessed++;
		}
		return { subscribers: subscriberCountProcessed, sent: subscriberCountSent };
	}

	async addReceiver(
		newReceiver: MessageEventSubscriptionReceiverInterface,
		subscriptionSets?: EventMessageSubscriptionSet[],
	) {
		if (newReceiver.name in this.#subscribers) {
			await this.terminateReceiver(newReceiver.name);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		// newReceiver.worker = await spawn<EventSubscriberWorker>(new Worker(newReceiver.workerFile));
		newReceiver.worker = await newReceiver.launchThread();
		this.#subscribers[newReceiver.name] = {
			receiver: newReceiver,
			subscriptions: subscriptionSets ?? [],
		};
	}

	async removeReceiver(receiverName: string) {
		await this.terminateReceiver(receiverName);
		delete this.#subscribers[receiverName];
	}

	addSubscriptionSets(receiverName: string, subscriptionSets: EventMessageSubscriptionSet[]) {
		if (receiverName in this.#subscribers) {
			this.#subscribers[receiverName].subscriptions = unionBy(
				this.#subscribers[receiverName].subscriptions,
				subscriptionSets,
				iteratee('name'),
			);
		}
	}

	removeSubscriptionSet(subscriptionSetName: string) {
		if (subscriptionSetName in this.#subscribers) {
			remove(
				this.#subscribers[subscriptionSetName].subscriptions,
				(e) => e.name === subscriptionSetName,
			);
		}
	}

	getSubscribers() {
		return this.#subscribers;
	}

	close() {}

	async terminateReceiver(receiverName?: string) {
		const terminateList = receiverName ? [receiverName] : Object.keys(this.#subscribers);
		for (const terminateName of terminateList) {
			await this.#getReceiverByName(terminateName)?.terminateThread();
		}
	}

	#getReceiverByName(receiverName: string): MessageEventSubscriptionReceiverInterface | undefined {
		if (receiverName in this.#subscribers && this.#subscribers[receiverName].receiver) {
			return this.#subscribers[receiverName].receiver;
		}
		return;
	}

	#getSubscriptionSetsByName(receiverName: string): EventMessageSubscriptionSet[] | undefined {
		if (receiverName in this.#subscribers && this.#subscribers[receiverName].subscriptions) {
			return this.#subscribers[receiverName].subscriptions;
		}
		return;
	}
}
