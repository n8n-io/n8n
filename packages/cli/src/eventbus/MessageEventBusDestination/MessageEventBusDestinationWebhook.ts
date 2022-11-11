import { EventMessage } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import axios from 'axios';

export interface MessageEventBusDestinationWebhookOptions {
	url: string;
	name?: string;
	expectedStatusCode?: number;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
	readonly url: string;

	readonly expectedStatusCode: number;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super({ name: options.name ?? 'WebhookDestination' });
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.url = options.url;
		console.debug(`MessageEventBusDestinationWebhook Broker initialized`);
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		console.log('URL', this.url);
		try {
			const postResult = await axios.post(this.url, msg);
			if (postResult.status === this.expectedStatusCode) {
				return true;
			}
		} catch (error) {
			console.log(error);
		}
		return false;
	}

	async close() {
		// Nothing to do
	}

	// async addSubscription(
	// 	receiver: MessageEventSubscriptionReceiverInterface,
	// 	subscriptionSets: EventMessageSubscriptionSet[],
	// ) {
	// 	await receiver.worker?.communicate('subscribe', 'n8n-events');
	// }
}
