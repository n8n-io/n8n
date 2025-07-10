import type { User } from '@n8n/db';
import { WorkflowStatisticsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

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
