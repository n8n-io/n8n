import { Service } from 'typedi';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import { OrchestrationService } from '../../orchestration.service';
import config from '@/config';

@Service()
export class OrchestrationWorkerService extends OrchestrationService {
	sanityCheck(): boolean {
		return (
			this.isInitialized &&
			config.get('executions.mode') === 'queue' &&
			config.get('generic.instanceType') === 'worker'
		);
	}

	async publishToEventLog(message: AbstractEventMessage) {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToEventLog(message);
	}
}
