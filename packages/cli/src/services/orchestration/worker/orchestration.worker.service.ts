import { Service } from 'typedi';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import { OrchestrationService } from '../../orchestration.base.service';

@Service()
export class OrchestrationWorkerService extends OrchestrationService {
	sanityCheck(): boolean {
		return this.isInitialized && this.isQueueMode && this.isWorkerInstance;
	}

	async publishToEventLog(message: AbstractEventMessage) {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToEventLog(message);
	}
}
