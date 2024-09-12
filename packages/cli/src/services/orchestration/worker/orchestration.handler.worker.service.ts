import { Service } from 'typedi';

import { getWorkerCommandReceivedHandler } from './handle-command-message-worker';
import type { WorkerCommandReceivedHandlerOptions } from './types';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';

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
