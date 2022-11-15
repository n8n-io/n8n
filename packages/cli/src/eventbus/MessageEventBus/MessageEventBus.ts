import { registerSerializer } from 'threads';
import {
	EventMessage,
	EventMessageSerialized,
	messageEventSerializer,
} from '../EventMessageClasses/EventMessage';
import { eventMessageConfirmSerializer } from '../EventMessageClasses/EventMessageConfirm';
import { EventMessageSubscriptionSet } from '../EventMessageClasses/EventMessageSubscriptionSet';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';

interface MessageEventBusInitializationOptions {
	destinations?: MessageEventBusDestination[];
}

interface EventMessageDestinationStore {
	[key: string]: MessageEventBusDestination;
}

export interface EventMessageSubscribeDestination {
	subscriptionSet: EventMessageSubscriptionSet;
	destinationId: string;
}

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all';

class MessageEventBus {
	static #initialized = false;

	static #instance: MessageEventBus;

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
		// Register the thread serializer on the main thread
		registerSerializer(messageEventSerializer);
		registerSerializer(eventMessageConfirmSerializer);

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
			// console.debug('Checking for unsent messages...');
			await this.#trySendingUnsent();
		}, 5000);

		console.debug('MessageEventBus initialized');
		MessageEventBus.#initialized = true;
	}

	async addDestination(destination: MessageEventBusDestination) {
		await this.removeDestination(destination.getId());
		this.#destinations[destination.getId()] = destination;
		return destination.serialize();
	}

	async removeDestination(id: string): Promise<string> {
		if (id in Object.keys(this.#destinations)) {
			await this.#destinations[id].close();
			delete this.#destinations[id];
		}
		return id;
	}

	setDestinationSubscriptionSet(
		destinationId: string,
		subscriptionSet: EventMessageSubscriptionSet,
	) {
		if (destinationId in Object.keys(this.#destinations)) {
			this.#destinations[destinationId].setSubscription(subscriptionSet);
		}
		return destinationId;
	}

	async #trySendingUnsent() {
		const unsentMessages = await this.getEventsUnsent();
		console.debug(`Found unsent EventMessages: ${unsentMessages.length}`);
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
