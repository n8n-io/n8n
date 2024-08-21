import { Service } from 'typedi';
import { COMMAND_REDIS_CHANNEL, WORKER_RESPONSE_REDIS_CHANNEL } from '../../redis/RedisConstants';
import { handleWorkerResponseMessageMain } from './handleWorkerResponseMessageMain';
import { handleCommandMessageMain } from './handleCommandMessageMain';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import type { MainResponseReceivedHandlerOptions } from './types';

@Service()
export class OrchestrationHandlerMainService extends OrchestrationHandlerService {
	async initSubscriber(options: MainResponseReceivedHandlerOptions) {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToCommandChannel();
		await this.redisSubscriber.subscribeToWorkerResponseChannel();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					await handleWorkerResponseMessageMain(messageString, options);
				} else if (channel === COMMAND_REDIS_CHANNEL) {
					await handleCommandMessageMain(messageString);
				}
			},
		);
	}
}
