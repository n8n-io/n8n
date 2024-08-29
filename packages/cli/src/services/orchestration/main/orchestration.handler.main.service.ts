import Container, { Service } from 'typedi';
import { COMMAND_REDIS_CHANNEL, WORKER_RESPONSE_REDIS_CHANNEL } from '../../redis/redis-constants';
import { handleWorkerResponseMessageMain } from './handle-worker-response-message-main';
import { handleCommandMessageMain } from './handle-command-message-main';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import type { MainResponseReceivedHandlerOptions } from './types';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';

@Service()
export class OrchestrationHandlerMainService extends OrchestrationHandlerService {
	subscriber: Subscriber;

	async initSubscriber(options: MainResponseReceivedHandlerOptions) {
		this.subscriber = Container.get(Subscriber);

		await this.subscriber.subscribe('n8n.commands');
		await this.subscriber.subscribe('n8n.worker-response');

		this.subscriber.setHandler(async (channel: string, messageString: string) => {
			if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
				await handleWorkerResponseMessageMain(messageString, options);
			} else if (channel === COMMAND_REDIS_CHANNEL) {
				await handleCommandMessageMain(messageString);
			}
		});
	}
}
