import { Service } from 'typedi';
import type { AbstractEventMessage } from '../../../eventbus/EventMessageClasses/AbstractEventMessage';
import { OrchestrationService } from '../../orchestration.base.service';

@Service()
export class OrchestrationWorkerService extends OrchestrationService {
	async publishToEventLog(message: AbstractEventMessage) {
		if (!this.initialized) {
			throw new Error('OrchestrationWorkerService not initialized');
		}
		await this.redisPublisher.publishToEventLog(message);
	}
}
