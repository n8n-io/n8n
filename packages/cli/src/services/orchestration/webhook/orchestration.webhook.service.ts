import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.service';
import config from '@/config';

@Service()
export class OrchestrationWebhookService extends OrchestrationService {
	sanityCheck(): boolean {
		return (
			this.isInitialized &&
			config.get('executions.mode') === 'queue' &&
			config.get('generic.instanceType') === 'webhook'
		);
	}
}
