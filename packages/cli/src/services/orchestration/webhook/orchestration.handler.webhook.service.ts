import Container, { Service } from 'typedi';

import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { handleCommandMessageWebhook } from './handle-command-message-webhook';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import { COMMAND_REDIS_CHANNEL } from '../../redis/redis-constants';

@Service()
export class OrchestrationHandlerWebhookService extends OrchestrationHandlerService {
	subscriber: Subscriber;

	async initSubscriber() {
		this.subscriber = Container.get(Subscriber);

		await this.subscriber.subscribe('n8n.commands');

		this.subscriber.setHandler(async (channel: string, messageString: string) => {
			if (channel === COMMAND_REDIS_CHANNEL) {
				await handleCommandMessageWebhook(messageString);
			}
		});
	}
}
