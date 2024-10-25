import { Service } from 'typedi';

import { LicenseMetricsRepository } from '@/databases/repositories/license-metrics.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@Service()
export class LicenseMetricsService {
	constructor(
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
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
		} = await this.licenseMetricsRepository.getLicenseRenewalMetrics();

		const activeTriggerCount = await this.workflowRepository.getActiveTriggerCount();

		return [
			{ name: 'activeWorkflows', value: activeWorkflows },
			{ name: 'totalWorkflows', value: totalWorkflows },
			{ name: 'enabledUsers', value: enabledUsers },
			{ name: 'totalUsers', value: totalUsers },
			{ name: 'totalCredentials', value: totalCredentials },
			{ name: 'productionExecutions', value: productionExecutions },
			{ name: 'manualExecutions', value: manualExecutions },
			{ name: 'activeWorkflowTriggers', value: activeTriggerCount },
		];
	}

	async collectPassthroughData() {
		return {
			activeWorkflowIds: await this.workflowRepository.getActiveIds(),
		};
	}
}
