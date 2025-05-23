import { LicenseMetricsRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

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
			productionRootExecutions,
			manualExecutions,
		} = await this.licenseMetricsRepository.getLicenseRenewalMetrics();

		const [activeTriggerCount, workflowsWithEvaluationsCount] = await Promise.all([
			this.workflowRepository.getActiveTriggerCount(),
			this.workflowRepository.getWorkflowsWithEvaluationCount(),
		]);

		return [
			{ name: 'activeWorkflows', value: activeWorkflows },
			{ name: 'totalWorkflows', value: totalWorkflows },
			{ name: 'enabledUsers', value: enabledUsers },
			{ name: 'totalUsers', value: totalUsers },
			{ name: 'totalCredentials', value: totalCredentials },
			{ name: 'productionExecutions', value: productionExecutions },
			{ name: 'productionRootExecutions', value: productionRootExecutions },
			{ name: 'manualExecutions', value: manualExecutions },
			{ name: 'activeWorkflowTriggers', value: activeTriggerCount },
			{ name: 'evaluations', value: workflowsWithEvaluationsCount },
		];
	}

	async collectPassthroughData() {
		return {
			// Get only the first 1000 active workflow IDs to avoid sending too much data to License Server
			// Passthrough data is forwarded to Telemetry for further analysis, such as quota excesses
			activeWorkflowIds: await this.workflowRepository.getActiveIds({ maxResults: 1000 }),
		};
	}
}
