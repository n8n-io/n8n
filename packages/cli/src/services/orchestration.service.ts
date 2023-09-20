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

	private _uniqueInstanceId = '';

	get uniqueInstanceId(): string {
		return this._uniqueInstanceId;
	}

	redisPublisher: RedisServicePubSubPublisher;

	redisSubscriber: RedisServicePubSubSubscriber;

	constructor(readonly redisService: RedisService) {}

	async init(uniqueInstanceId: string) {
		this._uniqueInstanceId = uniqueInstanceId;
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
					await handleCommandMessage(messageString, this.uniqueInstanceId);
				}
			},
		);
	}

	async getWorkerStatus(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'getId',
		});
	}

	// TODO: not implemented yet on worker side
	async stopWorker(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'stopWorker',
			targets: id ? [id] : undefined,
		});
	}

	// reload the license on workers after it was changed on the main instance
	async reloadLicense(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'reloadLicense',
			targets: id ? [id] : undefined,
		});
	}
}
