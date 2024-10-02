import { Service } from 'typedi';

import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { getWorkerCommandReceivedHandler } from './handle-command-message-worker';
import type { WorkerCommandReceivedHandlerOptions } from './types';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';

@Service()
export class OrchestrationHandlerWorkerService extends OrchestrationHandlerService {
	constructor(private readonly subscriber: Subscriber) {
		super();
	}

	async initSubscriber(options: WorkerCommandReceivedHandlerOptions) {
		await this.subscriber.subscribe('n8n.commands');

		this.subscriber.setMessageHandler('n8n.commands', async (message: string) => {
			await getWorkerCommandReceivedHandler(message, options);
		});
	}
}
