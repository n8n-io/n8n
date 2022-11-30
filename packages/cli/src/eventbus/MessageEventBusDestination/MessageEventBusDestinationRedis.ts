/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import Redis, { RedisOptions } from 'ioredis';
import {
	JsonObject,
	jsonParse,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';

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

export class MessageEventBusDestinationRedis
	extends MessageEventBusDestination
	implements MessageEventBusDestinationRedisOptions
{
	client: Redis.Redis | undefined;

	channelName: string;

	redisOptions: RedisOptions;

	anonymizeMessages?: boolean;

	constructor(options: MessageEventBusDestinationRedisOptions) {
		super(options);
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.redis;
		if (options.anonymizeMessages) this.anonymizeMessages = options.anonymizeMessages;
		this.redisOptions = options?.redisOptions ?? {
			port: 6379, // Redis port
			host: '127.0.0.1', // Redis host
			db: 0, // Defaults to 0
		};
		this.channelName = options.channelName;
		this.client = new Redis(this.redisOptions);
		// this.#client?.monitor((error, monitor) => {
		// 	monitor?.on('monitor', (time, args, source, database) => {
		// 		console.log(time, args, source, database);
		// 	});
		// });
		console.debug(`MessageEventBusDestinationRedis Broker initialized`);
	}

	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
		if (this.client?.status === 'ready') {
			if (this.anonymizeMessages) {
				msg = msg.anonymize();
			}
			const publishResult = await this.client?.publish(this.channelName, msg.toString());
			console.log(publishResult);
			console.debug(`MessageEventBusDestinationRedis forwarded  ${msg.eventName} - ${msg.id}`);
			await eventBus.confirmSent(msg, { id: this.id, name: this.label });
			return true;
		} else {
			console.debug(`MessageForwarderToRedis not in ready state`);
			return false;
		}
	}

	serialize(): MessageEventBusDestinationRedisOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			channelName: this.channelName,
			redisOptions: this.redisOptions as JsonObject,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationRedis | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.redis &&
			isMessageEventBusDestinationRedisOptions(data)
		) {
			return new MessageEventBusDestinationRedis(data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationRedis | null {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationRedis.deserialize(o);
	}

	async close() {
		this.client?.disconnect();
		this.client = undefined;
	}
}
