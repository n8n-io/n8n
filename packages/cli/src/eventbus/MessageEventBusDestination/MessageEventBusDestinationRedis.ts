import { EventMessage } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import { eventBus } from '../MessageEventBus/MessageEventBus';
// eslint-disable-next-line import/no-extraneous-dependencies
import Redis, { RedisOptions } from 'ioredis';

interface MessageEventBusDestinationRedisOptions {
	channelName: string;
	redisOptions?: RedisOptions;
	name?: string;
}

export class MessageEventBusDestinationRedis extends MessageEventBusDestination {
	#client: Redis | undefined;

	#channelName: string;

	constructor(options: MessageEventBusDestinationRedisOptions) {
		super({ name: options.name ?? 'RedisForwarder' });
		options.redisOptions = options?.redisOptions ?? {
			port: 6379, // Redis port
			host: '127.0.0.1', // Redis host
			db: 0, // Defaults to 0
		};
		this.#channelName = options.channelName;
		// this.#name = options.name ?? 'RedisForwarder';
		this.#client = new Redis(options.redisOptions);
		this.#client
			?.monitor((error, monitor) => {
				monitor?.on('monitor', (time, args, source, database) => {
					console.log(time, args, source, database);
				});
			})
			.catch((error) => console.log(error));
		console.debug(`MessageEventBusDestinationRedis Broker initialized`);
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		if (this.#client?.status === 'ready') {
			const publishResult = await this.#client?.publish(this.#channelName, msg.toString());
			console.log(publishResult);
			console.debug(`MessageEventBusDestinationRedis forwarded  ${msg.eventName} - ${msg.id}`);
			await eventBus.confirmSent(msg);
			return true;
		} else {
			console.debug(`MessageForwarderToRedis not in ready state`);
			return false;
		}
	}

	async close() {
		this.#client?.disconnect();
		this.#client = undefined;
	}

	// TODO: fix to work with EventMessageSubscriptionSetNames
	// async addSubscription(
	// 	receiver: MessageEventSubscriptionReceiverInterface,
	// 	subscriptionSets: EventMessageSubscriptionSet[],
	// ) {
	// 	await receiver.worker?.communicate('subscribe', 'n8n-events');
	// }
}
