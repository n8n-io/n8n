import { LocalEventBroker } from '../EventBrokers/LocalEventBroker';
import { EventMessage } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageSubscriptionSet } from '../EventMessageClasses/EventMessageSubscriptionSet';
import { MessageEventSubscriptionReceiverInterface } from '../MessageEventSubscriptionReceiver/MessageEventSubscriptionReceiverInterface';

interface MessageEventBusDestinationLocalBrokerOptions {
	name?: string;
}

export class MessageEventBusDestinationLocalBroker implements MessageEventBusDestination {
	#localBroker: LocalEventBroker;

	#name: string;

	constructor(options?: MessageEventBusDestinationLocalBrokerOptions) {
		this.#localBroker = new LocalEventBroker();
		this.#name = options?.name ?? 'LocalBrokerForwarder';
		console.debug(`MessageForwarderToLocalBroker Broker initialized`);
	}

	getName(): string {
		return this.#name;
	}

	async sendToDestination(msg: EventMessage): Promise<boolean> {
		const result = await this.#localBroker?.addMessage(msg);
		console.debug(`MessageForwarderToLocalBroker forwarded  ${msg.eventName} - ${msg.id}`);
		console.debug(
			`MessageForwarderToLocalBroker subscribers: ${result.subscribers} - actually sent: ${result.sent}`,
		);

		// to confirm it is enough that subscribers have existed at all who could potentially receive the message,
		// NOT that any of them actually subscribed to that particular eventName.
		if (result.subscribers > 0) {
			console.debug(`MessageForwarderToLocalBroker confirm ${msg.eventName} - ${msg.id}`);
			await eventBus.confirmSent(msg);
			return true;
		}
		return false;
	}

	async close() {
		await this.#localBroker.terminateReceiver();
	}

	async addReceiver(receiver: MessageEventSubscriptionReceiverInterface) {
		await this.#localBroker.addReceiver(receiver);
		return this;
	}

	addSubscription(
		receiver: MessageEventSubscriptionReceiverInterface,
		subscriptionSets: EventMessageSubscriptionSet[],
	) {
		this.#localBroker.addSubscriptionSets(receiver.name, subscriptionSets);
		return this;
	}
}
