import { Service } from 'typedi';

import { handleCommandMessageWebhook } from './handle-command-message-webhook';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import { COMMAND_REDIS_CHANNEL } from '../../redis/redis-constants';

@Service()
export class OrchestrationHandlerWebhookService extends OrchestrationHandlerService {
	async initSubscriber() {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToCommandChannel();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				if (channel === COMMAND_REDIS_CHANNEL) {
					await handleCommandMessageWebhook(messageString);
				}
			},
		);
	}
}
