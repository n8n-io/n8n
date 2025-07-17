import { Service } from '@n8n/di';
import { UsageEntity, UsageRepository } from '@n8n/db';

export interface UsageRecordParams {
	workflowId: string;
	userId: string;
	executionDate: Date;
	tokensConsumed: number;
	costIncurred: number;
}

@Service()
export class UsageService {
	constructor(private readonly usageRepository: UsageRepository) {}

	async getUsageByUserId(userId: string) {
		return await this.usageRepository.findByUserId(userId);
	}

	async getUsageByWorkflowId(workflowId: string) {
		return await this.usageRepository.findByWorkflowId(workflowId);
	}

	async addTransactionRecord(params: UsageRecordParams) {
		// Create a proper UsageEntity instance
		const usageEntity = new UsageEntity();
		usageEntity.workflowId = params.workflowId;
		usageEntity.userId = params.userId;
		usageEntity.executionDate = params.executionDate;
		usageEntity.tokensConsumed = params.tokensConsumed;
		usageEntity.costIncurred = params.costIncurred;

		return await this.usageRepository.addTransactionRecord(usageEntity);
	}
}
