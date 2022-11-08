import { EventMessage } from '../EventMessage/EventMessage';
import { MessageEventBusForwarder } from './MessageEventBusForwarder';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageSubscriptionSet } from '../EventMessage/EventMessageSubscriptionSet';
import { MessageEventSubscriptionReceiverInterface } from '../MessageEventSubscriptionReceiver/MessageEventSubscriptionReceiverInterface';
// eslint-disable-next-line import/no-extraneous-dependencies
import Redis, { RedisOptions } from 'ioredis';
import { RedisEventSubscriptionReceiver } from '../MessageEventSubscriptionReceiver/RedisEventSubscriptionReceiver';

interface MessageEventBusForwarderToRedisOptions {
	channelName: string;
	redisOptions?: RedisOptions;
	name?: string;
}

export class MessageEventBusForwarderToRedis implements MessageEventBusForwarder {
	#client: Redis | undefined;

	#channelName: string;

	#receivers: RedisEventSubscriptionReceiver[] = [];

	#name: string;

	constructor(options: MessageEventBusForwarderToRedisOptions) {
		options.redisOptions = options?.redisOptions ?? {
			port: 6379, // Redis port
			host: '127.0.0.1', // Redis host
			db: 0, // Defaults to 0
		};
		this.#channelName = options.channelName;
		this.#name = options.name ?? 'RedisForwarder';
		this.#client = new Redis(options.redisOptions);
		this.#client
			?.monitor((error, monitor) => {
				monitor?.on('monitor', (time, args, source, database) => {
					console.log(time, args, source, database);
				});
			})
			.catch((error) => console.log(error));
		console.debug(`MessageForwarderToRedis Broker initialized`);
	}

	getName(): string {
		return this.#name;
	}

	async forward(msg: EventMessage): Promise<boolean> {
		if (this.#client?.status === 'ready') {
			const publishResult = await this.#client?.publish(this.#channelName, msg.toString());
			console.log(publishResult);
			console.debug(`MessageForwarderToRedis forwarded  ${msg.eventName} - ${msg.id}`);
			await eventBus.confirmSent(msg);
			return true;
		} else {
			console.debug(`MessageForwarderToRedis not in ready state`);
			return false;
		}
	}

	close() {
		this.#client?.disconnect();
		this.#client = undefined;
	}

	async addReceiver(receiver: RedisEventSubscriptionReceiver) {
		const launchResult = await receiver.launchThread();
		if (launchResult) {
			await receiver.worker?.communicate('connect', undefined);
			this.#receivers.push(receiver);
		}
		return launchResult;
	}

	async addSubscription(
		receiver: MessageEventSubscriptionReceiverInterface,
		subscriptionSets: EventMessageSubscriptionSet[],
	) {
		await receiver.worker?.communicate('subscribe', 'n8n-events');
	}
}
