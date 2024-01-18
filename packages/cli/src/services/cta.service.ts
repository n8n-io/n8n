import { Service } from 'typedi';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflowStatistics.repository';
import type { User } from '@/databases/entities/User';

@Service()
export class CtaService {
	constructor(private readonly workflowStatisticsRepository: WorkflowStatisticsRepository) {}

	async getBecomeCreatorCta(userId: User['id']) {
		// There need to be at least 3 workflows with at least 5 executions
		const numWfsWithOver5ProdExecutions =
			await this.workflowStatisticsRepository.queryNumWorkflowsUserHasWithFiveOrMoreProdExecs(
				userId,
			);

		return numWfsWithOver5ProdExecutions >= 3;
	}
}
