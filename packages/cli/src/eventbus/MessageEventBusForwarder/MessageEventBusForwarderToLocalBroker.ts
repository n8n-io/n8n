import { LocalEventBroker } from '../EventBrokers/LocalEventBroker';
import { EventMessage } from '../EventMessage/EventMessage';
import { MessageEventBusForwarder } from './MessageEventBusForwarder';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageSubscriptionSet } from '../EventMessage/EventMessageSubscriptionSet';
import { MessageEventSubscriptionReceiverInterface } from '../MessageEventSubscriptionReceiver/MessageEventSubscriptionReceiverInterface';

interface MessageEventBusForwarderToLocalBrokerOptions {
	name?: string;
}

export class MessageEventBusForwarderToLocalBroker implements MessageEventBusForwarder {
	#localBroker: LocalEventBroker;

	#name: string;

	constructor(options?: MessageEventBusForwarderToLocalBrokerOptions) {
		this.#localBroker = new LocalEventBroker();
		this.#name = options?.name ?? 'LocalBrokerForwarder';
		console.debug(`MessageForwarderToLocalBroker Broker initialized`);
	}

	getName(): string {
		return this.#name;
	}

	async forward(msg: EventMessage): Promise<boolean> {
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

	close() {
		this.#localBroker.terminateReceiver().catch((error) => console.log(error));
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
