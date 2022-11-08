import { EventMessage, EventMessageSerialized } from '../EventMessage/EventMessage';
import { MessageEventBusWriter } from '../MessageEventBusWriter/MessageEventBusWriter';
import { MessageEventBusForwarder } from '../MessageEventBusForwarder/MessageEventBusForwarder';
import unionBy from 'lodash.unionby';
import iteratee from 'lodash.iteratee';
import remove from 'lodash.remove';

interface MessageEventBusInitializationOptions {
	forwarders: MessageEventBusForwarder[];
	immediateWriters: MessageEventBusWriter[];
}

class MessageEventBus {
	static #instance: MessageEventBus;

	#immediateWriters: MessageEventBusWriter[];

	#forwarders: MessageEventBusForwarder[];

	#pushInteralTimer: NodeJS.Timer;

	#eventMessageQueue: EventMessage[] = [];

	static getInstance(): MessageEventBus {
		if (!MessageEventBus.#instance) {
			MessageEventBus.#instance = new MessageEventBus();
		}
		return MessageEventBus.#instance;
	}

	async initialize(options: MessageEventBusInitializationOptions) {
		if (this.#pushInteralTimer) {
			clearInterval(this.#pushInteralTimer);
		}
		this.#immediateWriters = options.immediateWriters;
		this.#forwarders = options.forwarders;

		await this.send(
			new EventMessage({
				eventName: 'n8n.core.eventBusInitialized',
				level: 'debug',
				severity: 'normal',
			} as EventMessageSerialized),
		);

		// check for unsent messages
		await this.trySendingUnsent();
		this.#pushInteralTimer = setInterval(async () => {
			console.debug('Checking for unsent messages...');
			await this.trySendingUnsent();
		}, 5000);

		console.debug('MessageEventBus initialized');
	}

	addForwarder(forwarder: MessageEventBusForwarder) {
		this.#forwarders.push(forwarder);
	}

	removeForwarder(name: string) {
		const removedForwarder = remove(this.#forwarders, (e) => e.getName() === name);
		removedForwarder.map((e) => {
			e.close();
		});
		removedForwarder.fill(undefined);
	}

	async trySendingUnsent() {
		// check for unsent messages
		const unsentMessages = await this.getEventsUnsent();
		console.debug(`Found unsent messages: ${unsentMessages.length}`);
		for (const unsentMsg of unsentMessages) {
			await this.#forwardMessage(unsentMsg);
		}
	}

	close() {
		// TODO: make sure all msg are written
		for (const writer of this.#immediateWriters) {
			writer.close();
		}
		for (const forwarder of this.#forwarders) {
			forwarder.close();
		}
		// TODO: make sure all msg are sent
		if (this.#eventMessageQueue.length > 0) {
			console.error('Messages left in MessageBuffer queue');
		}
	}

	async send(msg: EventMessage) {
		console.debug(`MessageEventBus Msg received ${msg.eventName} - ${msg.id}`);
		await this.#writePutMessage(msg);
		await this.#forwardMessage(msg);
	}

	async confirmSent(msg: EventMessage) {
		await this.#writeConfirmMessageSent(msg.getKey());
	}

	async #writePutMessage(msg: EventMessage) {
		for (const writer of this.#immediateWriters) {
			await writer.putMessage(msg);
			console.debug(`MessageEventBus Msg written  ${msg.eventName} - ${msg.id}`);
		}
	}

	async #writeConfirmMessageSent(key: string) {
		for (const writer of this.#immediateWriters) {
			await writer.confirmMessageSent(key);
			console.debug(`MessageEventBus confirmed ${key}`);
		}
	}

	async #forwardMessage(msg: EventMessage) {
		for (const forwarder of this.#forwarders) {
			await forwarder.forward(msg);
			console.debug(`MessageEventBus Msg forwarded  ${msg.eventName} - ${msg.id}`);
		}
	}

	async getEvents(options: { returnUnsent: boolean }): Promise<EventMessage[]> {
		if (this.#immediateWriters.length > 1) {
			const allQueryResults = [];
			for (const writer of this.#immediateWriters) {
				let queryResult: EventMessage[];
				if (options.returnUnsent) {
					queryResult = await writer.getMessagesUnsent();
				} else {
					queryResult = await writer.getMessagesSent();
				}
				if (queryResult.length > 0) {
					allQueryResults.push(queryResult);
				}
			}
			const unionResult = unionBy(allQueryResults, iteratee('id'));
			if (unionResult && unionResult.length > 0) {
				return unionResult[0];
			}
			// return allQueryResults[0];
			return [];
		} else if (this.#immediateWriters.length === 1) {
			let queryResult: EventMessage[];
			if (options.returnUnsent) {
				queryResult = await this.#immediateWriters[0].getMessagesUnsent();
			} else {
				queryResult = await this.#immediateWriters[0].getMessagesSent();
			}
			return queryResult;
		} else {
			return [];
		}
	}

	async getEventsSent() {
		const sentMessages = await this.getEvents({ returnUnsent: false });
		console.debug(`Sent Messages: ${sentMessages.length}`);
		return sentMessages;
	}

	async getEventsUnsent() {
		const unSentMessages = await this.getEvents({ returnUnsent: true });
		console.debug(`Unsent Messages: ${unSentMessages.length}`);
		return unSentMessages;
	}
}

export const eventBus = MessageEventBus.getInstance();
