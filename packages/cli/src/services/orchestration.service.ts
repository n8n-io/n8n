import { Service } from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import type { RedisServicePubSubSubscriber } from './redis/RedisServicePubSubSubscriber';
import { COMMAND_REDIS_CHANNEL, WORKER_RESPONSE_REDIS_CHANNEL } from './redis/RedisServiceHelper';
import { handleWorkerResponseMessage } from './orchestration/handleWorkerResponseMessage';
import { handleCommandMessage } from './orchestration/handleCommandMessage';

@Service()
export class OrchestrationService {
	private initialized = false;

	redisPublisher: RedisServicePubSubPublisher;

	redisSubscriber: RedisServicePubSubSubscriber;

	constructor(readonly redisService: RedisService) {}

	async init() {
		await this.initPublisher();
		await this.initSubscriber();
		this.initialized = true;
	}

	async shutdown() {
		await this.redisPublisher?.destroy();
		await this.redisSubscriber?.destroy();
	}

	private async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}

	private async initSubscriber() {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToWorkerResponseChannel();
		await this.redisSubscriber.subscribeToCommandChannel();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					await handleWorkerResponseMessage(messageString);
				} else if (channel === COMMAND_REDIS_CHANNEL) {
					await handleCommandMessage(messageString);
				}
			},
		);
	}

	async getWorkerStatus(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'getId',
		});
	}
}
