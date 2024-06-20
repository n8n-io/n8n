import { UsageMetricsRepository } from '@/databases/repositories/usageMetrics.repository';
import { Service } from 'typedi';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@Service()
export class UsageMetricsService {
	constructor(
		private readonly usageMetricsRepository: UsageMetricsRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async collectUsageMetrics() {
		const {
			activeWorkflows,
			totalWorkflows,
			enabledUsers,
			totalUsers,
			totalCredentials,
			productionExecutions,
			manualExecutions,
		} = await this.usageMetricsRepository.getLicenseRenewalMetrics();

		return [
			{ name: 'activeWorkflows', value: activeWorkflows },
			{ name: 'totalWorkflows', value: totalWorkflows },
			{ name: 'enabledUsers', value: enabledUsers },
			{ name: 'totalUsers', value: totalUsers },
			{ name: 'totalCredentials', value: totalCredentials },
			{ name: 'productionExecutions', value: productionExecutions },
			{ name: 'manualExecutions', value: manualExecutions },
		];
	}

	async collectPassthroughData() {
		return {
			activeWorkflowIds: await this.workflowRepository.getActiveIds(),
		};
	}
}
