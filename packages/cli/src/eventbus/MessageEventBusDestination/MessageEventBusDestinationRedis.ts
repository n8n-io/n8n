import { EventMessage } from '../EventMessageClasses/EventMessage';
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from '../EventMessageClasses/MessageEventBusDestination';
import { eventBus } from '../MessageEventBus/MessageEventBus';
// eslint-disable-next-line import/no-extraneous-dependencies
import Redis, { RedisOptions } from 'ioredis';
import { JsonObject, jsonParse, JsonValue } from 'n8n-workflow';

export const isMessageEventBusDestinationRedisOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationRedisOptions => {
	const o = candidate as MessageEventBusDestinationRedisOptions;
	if (!o) return false;
	return o.channelName !== undefined;
};

interface MessageEventBusDestinationRedisOptions extends MessageEventBusDestinationOptions {
	channelName: string;
	redisOptions?: RedisOptions;
}

export class MessageEventBusDestinationRedis extends MessageEventBusDestination {
	static readonly type = '$$MessageEventBusDestinationRedis';

	#client: Redis | undefined;

	#channelName: string;

	redisOptions: RedisOptions;

	constructor(options: MessageEventBusDestinationRedisOptions) {
		super(options);
		this.redisOptions = options?.redisOptions ?? {
			port: 6379, // Redis port
			host: '127.0.0.1', // Redis host
			db: 0, // Defaults to 0
		};
		this.#channelName = options.channelName;
		this.#client = new Redis(this.redisOptions);
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

	serialize(): JsonValue {
		return {
			type: MessageEventBusDestinationRedis.type,
			id: this.getId(),
			options: {
				name: this.getName(),
				channelName: this.#channelName,
				redisOptions: this.redisOptions as JsonObject,
				subscriptionSet: this.subscriptionSet.serialize(),
			},
		};
	}

	static deserialize(data: JsonObject): MessageEventBusDestinationRedis | undefined {
		if (
			'type' in data &&
			data.type === MessageEventBusDestinationRedis.type &&
			'options' in data &&
			isMessageEventBusDestinationRedisOptions(data.options)
		) {
			return new MessageEventBusDestinationRedis(data.options);
		}
		return undefined;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationRedis | undefined {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationRedis.deserialize(o);
	}

	async close() {
		this.#client?.disconnect();
		this.#client = undefined;
	}
}
