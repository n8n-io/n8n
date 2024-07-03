import { Service } from 'typedi';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';
import { getWorkerCommandReceivedHandler } from './handleCommandMessageWorker';
import type { WorkerCommandReceivedHandlerOptions } from './types';

@Service()
export class OrchestrationHandlerWorkerService extends OrchestrationHandlerService {
	async initSubscriber(options: WorkerCommandReceivedHandlerOptions) {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToCommandChannel();
		this.redisSubscriber.addMessageHandler(
			'WorkerCommandReceivedHandler',
			getWorkerCommandReceivedHandler(options),
		);
	}
}
