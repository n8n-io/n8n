import { EventMessage, EventMessageSerialized } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import remove from 'lodash.remove';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';
import { EventMessageSubscriptionSet } from '../EventMessageClasses/EventMessageSubscriptionSet';

interface MessageEventBusInitializationOptions {
	destinations?: MessageEventBusDestination[];
}

interface EventMessageSubscriptionSetStore {
	[key: string]: EventMessageSubscriptionSet;
}

interface EventMessageDestinationStore {
	[key: string]: MessageEventBusDestination;
}

export interface EventMessageSubscribeDestination {
	subscriptionId: string;
	destinationId: string;
}

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all';

class MessageEventBus {
	static #initialized = false;

	static #instance: MessageEventBus;

	#subscriptionSets: EventMessageSubscriptionSetStore = {};

	#immediateWriter: MessageEventBusLogWriter;

	#destinations: EventMessageDestinationStore = {};

	#pushInteralTimer: NodeJS.Timer;

	static getInstance(): MessageEventBus {
		if (!MessageEventBus.#instance) {
			MessageEventBus.#instance = new MessageEventBus();
		}
		if (!MessageEventBus.#initialized) {
			MessageEventBus.#instance.initialize().catch((error) => console.log(error));
		}
		return MessageEventBus.#instance;
	}

	async initialize(options?: MessageEventBusInitializationOptions) {
		if (this.#pushInteralTimer) {
			clearInterval(this.#pushInteralTimer);
		}
		this.#immediateWriter = await MessageEventBusLogWriter.getInstance();
		if (options?.destinations) {
			for (const destination of options?.destinations) {
				this.#destinations[destination.getId()] = destination;
			}
		}

		await this.send(
			new EventMessage({
				eventName: 'n8n.core.eventBusInitialized',
				level: 'debug',
				severity: 'normal',
			} as EventMessageSerialized),
		);

		// check for unsent messages
		await this.#trySendingUnsent();

		// now start the logging to a fresh event log
		await this.#immediateWriter.startLogging();

		this.#pushInteralTimer = setInterval(async () => {
			console.debug('Checking for unsent messages...');
			await this.#trySendingUnsent();
		}, 5000);

		console.debug('MessageEventBus initialized');
		MessageEventBus.#initialized = true;
	}

	async addDestination(destination: MessageEventBusDestination) {
		await this.removeDestination(destination.getId());
		this.#destinations[destination.getId()] = destination;
		return destination.getId();
	}

	async removeDestination(id: string): Promise<string> {
		if (id in Object.keys(this.#destinations)) {
			await this.#destinations[id].close();
			delete this.#destinations[id];
		}
		return id;
	}

	addSubscriptionSet(subscriptionSet: EventMessageSubscriptionSet): void {
		const subscriptionSetName = subscriptionSet.getId();
		if (subscriptionSetName in this.#subscriptionSets) {
			this.#subscriptionSets[subscriptionSetName].eventGroups = subscriptionSet.eventGroups;
			this.#subscriptionSets[subscriptionSetName].eventNames = subscriptionSet.eventNames;
			this.#subscriptionSets[subscriptionSetName].eventLevels = subscriptionSet.eventLevels;
		} else {
			this.#subscriptionSets[subscriptionSetName] = subscriptionSet;
		}
	}

	getSubscriptionSet(subscriptionSetId: string) {
		if (subscriptionSetId in this.#subscriptionSets) {
			return this.#subscriptionSets[subscriptionSetId];
		}
		return undefined;
	}

	removeSubscriptionSet(subscriptionSetId: string) {
		if (subscriptionSetId in this.#subscriptionSets) {
			delete this.#subscriptionSets[subscriptionSetId];
		}
	}

	addSubscription(options: EventMessageSubscribeDestination): void {
		if (
			Object.keys(this.#destinations).includes(options.destinationId) &&
			Object.keys(this.#subscriptionSets).includes(options.subscriptionId)
		) {
			this.#destinations[options.destinationId].addSubscription(options.subscriptionId);
		}
	}

	removeSubscription(options: EventMessageSubscribeDestination) {
		if (Object.keys(this.#destinations).includes(options.destinationId)) {
			this.#destinations[options.destinationId].removeSubscription(options.subscriptionId);
		}
	}

	async #trySendingUnsent() {
		const unsentMessages = await this.getEventsUnsent();
		console.debug(`Found unsent messages: ${unsentMessages.length}`);
		for (const unsentMsg of unsentMessages) {
			await this.#sendToDestinations(unsentMsg);
		}
	}

	async close() {
		await this.#immediateWriter.close();
		for (const destinationName of Object.keys(this.#destinations)) {
			await this.#destinations[destinationName].close();
		}
	}

	async send(msg: EventMessage) {
		await this.#writeMessageToLog(msg);
		await this.#sendToDestinations(msg);
	}

	async confirmSent(msg: EventMessage) {
		await this.#writeConfirmationToLog(msg.id);
	}

	async #writeMessageToLog(msg: EventMessage) {
		await this.#immediateWriter.putMessage(msg);
	}

	async #writeConfirmationToLog(id: string) {
		await this.#immediateWriter.confirmMessageSent(id);
	}

	async #sendToDestinations(msg: EventMessage) {
		// if there are no destinations, immediately mark the event as sent
		if (Object.keys(this.#destinations).length === 0) {
			await this.confirmSent(msg);
		} else {
			for (const destinationName of Object.keys(this.#destinations)) {
				await this.#destinations[destinationName].receiveFromEventBus(msg);
			}
		}
	}

	async getEvents(mode: EventMessageReturnMode = 'all'): Promise<EventMessage[]> {
		let queryResult: EventMessage[];
		switch (mode) {
			case 'all':
				queryResult = await this.#immediateWriter.getMessages();
				break;
			case 'sent':
				queryResult = await this.#immediateWriter.getMessagesSent();
				break;
			case 'unsent':
				queryResult = await this.#immediateWriter.getMessagesUnsent();
		}
		return queryResult;
	}

	async getEventsSent() {
		const sentMessages = await this.getEvents('sent');
		return sentMessages;
	}

	async getEventsUnsent() {
		const unSentMessages = await this.getEvents('unsent');
		return unSentMessages;
	}
}

export const eventBus = MessageEventBus.getInstance();
