import { Service } from 'typedi';

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

		this.subscriber.setMessageHandler('n8n.worker-response', async (message: string) => {
			await handleWorkerResponseMessageMain(message, options);
		});

		this.subscriber.setMessageHandler('n8n.commands', handleCommandMessageMain);
	}
}
