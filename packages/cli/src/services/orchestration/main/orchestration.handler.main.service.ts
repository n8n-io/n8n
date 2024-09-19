import { Service } from 'typedi';

import { COMMAND_PUBSUB_CHANNEL, WORKER_RESPONSE_PUBSUB_CHANNEL } from '@/scaling/constants';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { handleCommandMessageMain } from './handle-command-message-main';
import { handleWorkerResponseMessageMain } from './handle-worker-response-message-main';
import type { MainResponseReceivedHandlerOptions } from './types';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';

@Service()
export class OrchestrationHandlerMainService extends OrchestrationHandlerService {
	constructor(private readonly subscriber: Subscriber) {
		super();
	}

	async initSubscriber(options: MainResponseReceivedHandlerOptions) {
		await this.subscriber.subscribe('n8n.commands');
		await this.subscriber.subscribe('n8n.worker-response');

		this.subscriber.addMessageHandler(async (channel: string, messageString: string) => {
			if (channel === WORKER_RESPONSE_PUBSUB_CHANNEL) {
				await handleWorkerResponseMessageMain(messageString, options);
			} else if (channel === COMMAND_PUBSUB_CHANNEL) {
				await handleCommandMessageMain(messageString);
			}
		});
	}
}
