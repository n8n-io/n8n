import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.base.service';

@Service()
export class OrchestrationWebhookService extends OrchestrationService {
	sanityCheck(): boolean {
		return this.initialized && this.isQueueMode && this.isWebhookInstance;
	}
}
