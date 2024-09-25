import { Service } from 'typedi';

import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { handleCommandMessageWebhook } from './handle-command-message-webhook';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';

@Service()
export class OrchestrationHandlerWebhookService extends OrchestrationHandlerService {
	constructor(private readonly subscriber: Subscriber) {
		super();
	}

	async initSubscriber() {
		await this.subscriber.subscribe('n8n.commands');

		this.subscriber.setMessageHandler('n8n.commands', handleCommandMessageWebhook);
	}
}
