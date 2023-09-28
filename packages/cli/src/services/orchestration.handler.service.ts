import Container, { Service } from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubSubscriber } from './redis/RedisServicePubSubSubscriber';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './redis/RedisServiceHelper';
import { handleWorkerResponseMessage } from './orchestration/handleWorkerResponseMessage';
import { handleCommandMessage } from './orchestration/handleCommandMessage';
import { MessageEventBus } from '../eventbus/MessageEventBus/MessageEventBus';

@Service()
export class OrchestrationHandlerService {
	redisSubscriber: RedisServicePubSubSubscriber;

	constructor(readonly redisService: RedisService) {}

	async init() {
		await this.initSubscriber();
	}

	async shutdown() {
		await this.redisSubscriber?.destroy();
	}

	private async initSubscriber() {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToWorkerResponseChannel();
		await this.redisSubscriber.subscribeToCommandChannel();
		await this.redisSubscriber.subscribeToEventLog();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					await handleWorkerResponseMessage(messageString);
				} else if (channel === COMMAND_REDIS_CHANNEL) {
					await handleCommandMessage(messageString);
				} else if (channel === EVENT_BUS_REDIS_CHANNEL) {
					await Container.get(MessageEventBus).handleRedisEventBusMessage(messageString);
				}
			},
		);
	}
}
