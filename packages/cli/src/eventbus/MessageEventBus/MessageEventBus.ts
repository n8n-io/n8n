import { EventMessage, EventMessageSerialized } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../MessageEventBusDestination/MessageEventBusDestination';
import remove from 'lodash.remove';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';
import { EventMessageSubscriptionSet } from '../EventMessageClasses/EventMessageSubscriptionSet';

interface MessageEventBusInitializationOptions {
	destinations?: MessageEventBusDestination[];
}

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all';

class MessageEventBus {
	static #initialized = false;

	static #instance: MessageEventBus;

	#subscriptionSets: EventMessageSubscriptionSet[];

	#immediateWriter: MessageEventBusLogWriter;

	#destinations: MessageEventBusDestination[];

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
		this.#destinations = options?.destinations ?? [];

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
		await this.removeDestination(destination.getName());
		this.#destinations.push(destination);
		return destination.getName();
	}

	async removeDestination(name: string): Promise<string[]> {
		const removedDestinations = remove(this.#destinations, (e) => e.getName() === name);
		for (const destination of removedDestinations) {
			await destination.close();
		}
		return removedDestinations.map((e) => e.getName());
	}

	addSubscriptionSet(subscriptionSet: EventMessageSubscriptionSet): void {
		const existingIndex = this.getSubscriptionSetIndex(subscriptionSet.getName());
		if (existingIndex !== -1) {
			this.#subscriptionSets[existingIndex].eventGroups = subscriptionSet.eventGroups;
			this.#subscriptionSets[existingIndex].eventNames = subscriptionSet.eventNames;
		} else {
			this.#subscriptionSets.push(subscriptionSet);
		}
	}

	removeSubscriptionSet(name: string) {
		remove(this.#subscriptionSets, (e) => e.getName() === name);
	}

	getSubscriptionSet(name: string) {
		return this.#subscriptionSets.find((e) => e.getName() === name);
	}

	getSubscriptionSetIndex(name: string) {
		return this.#subscriptionSets.findIndex((e) => e.getName() === name);
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
		for (const destination of this.#destinations) {
			await destination.close();
		}
	}

	async send(msg: EventMessage) {
		console.debug(`MessageEventBus Msg received ${msg.eventName} - ${msg.id}`);
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
		for (const destination of this.#destinations) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			await destination.receiveFromEventBus(msg);
			console.debug(`MessageEventBus Msg forwarded  ${msg.eventName} - ${msg.id}`);
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
