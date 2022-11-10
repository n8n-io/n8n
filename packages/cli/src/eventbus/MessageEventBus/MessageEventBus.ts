import { EventMessage, EventMessageSerialized } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../MessageEventBusDestination/MessageEventBusDestination';
import remove from 'lodash.remove';
import { MessageEventBusLogWriter } from '../MessageEventBusWriter/MessageEventBusLogWriter';

interface MessageEventBusInitializationOptions {
	forwarders?: MessageEventBusDestination[];
}

export type EventMessageReturnMode = 'sent' | 'unsent' | 'all';

class MessageEventBus {
	static #instance: MessageEventBus;

	#immediateWriter: MessageEventBusLogWriter;

	#forwarders: MessageEventBusDestination[];

	#pushInteralTimer: NodeJS.Timer;

	static getInstance(): MessageEventBus {
		if (!MessageEventBus.#instance) {
			MessageEventBus.#instance = new MessageEventBus();
		}
		return MessageEventBus.#instance;
	}

	async initialize(options?: MessageEventBusInitializationOptions) {
		if (this.#pushInteralTimer) {
			clearInterval(this.#pushInteralTimer);
		}
		this.#immediateWriter = await MessageEventBusLogWriter.getInstance();
		this.#forwarders = options?.forwarders ?? [];

		await this.send(
			new EventMessage({
				eventName: 'n8n.core.eventBusInitialized',
				level: 'debug',
				severity: 'normal',
			} as EventMessageSerialized),
		);

		// check for unsent messages
		await this.trySendingUnsent();

		// now start the logging to a fresh event log
		await this.#immediateWriter.startLogging();

		this.#pushInteralTimer = setInterval(async () => {
			console.debug('Checking for unsent messages...');
			await this.trySendingUnsent();
		}, 5000);

		console.debug('MessageEventBus initialized');
	}

	async addForwarder(forwarder: MessageEventBusDestination) {
		await this.removeForwarder(forwarder.getName());
		this.#forwarders.push(forwarder);
	}

	async removeForwarder(name: string) {
		const removedForwarder = remove(this.#forwarders, (e) => e.getName() === name);
		for (const forwarder of removedForwarder) {
			await forwarder.close();
		}
	}

	async trySendingUnsent() {
		const unsentMessages = await this.getEventsUnsent();
		console.debug(`Found unsent messages: ${unsentMessages.length}`);
		for (const unsentMsg of unsentMessages) {
			await this.#forwardMessage(unsentMsg);
		}
	}

	async close() {
		await this.#immediateWriter.close();
		for (const forwarder of this.#forwarders) {
			await forwarder.close();
		}
	}

	async send(msg: EventMessage) {
		console.debug(`MessageEventBus Msg received ${msg.eventName} - ${msg.id}`);
		await this.#writePutMessage(msg);
		await this.#forwardMessage(msg);
	}

	async confirmSent(msg: EventMessage) {
		await this.#writeConfirmMessageSent(msg.id);
	}

	async #writePutMessage(msg: EventMessage) {
		await this.#immediateWriter.putMessage(msg);
	}

	async #writeConfirmMessageSent(id: string) {
		await this.#immediateWriter.confirmMessageSent(id);
	}

	async #forwardMessage(msg: EventMessage) {
		for (const forwarder of this.#forwarders) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			await forwarder.sendToDestination(msg);
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
