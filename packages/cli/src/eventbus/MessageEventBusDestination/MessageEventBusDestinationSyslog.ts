import { EventMessage } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import syslog from 'syslog-client';

export interface MessageEventBusDestinationSyslogOptions {
	ip: string;
	name?: string;
	expectedStatusCode?: number;
}

export class MessageEventBusDestinationSyslog implements MessageEventBusDestination {
	readonly ip: string;

	readonly name: string;

	readonly expectedStatusCode: number;

	client: syslog.Client;

	constructor(options: MessageEventBusDestinationSyslogOptions) {
		this.name = options.name ?? 'SyslogDestination';
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.ip = options.ip ?? '127.0.0.1';
		this.client = syslog.createClient(this.ip, { appName: 'n8n' });
		console.debug(`MessageEventBusDestinationSyslog Broker initialized`);
	}

	getName(): string {
		return this.name;
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		try {
			this.client.log(msg.toString());
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
