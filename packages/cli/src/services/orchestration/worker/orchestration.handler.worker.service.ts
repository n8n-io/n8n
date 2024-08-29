import Container, { Service } from 'typedi';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import { getWorkerCommandReceivedHandler } from './handle-command-message-worker';
import type { WorkerCommandReceivedHandlerOptions } from './types';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';

@Service()
export class OrchestrationHandlerWorkerService extends OrchestrationHandlerService {
	subscriber: Subscriber;

	async initSubscriber(options: WorkerCommandReceivedHandlerOptions) {
		this.subscriber = Container.get(Subscriber);

		await this.subscriber.subscribe('n8n.commands');
		this.subscriber.setHandler(getWorkerCommandReceivedHandler(options));
	}
}
